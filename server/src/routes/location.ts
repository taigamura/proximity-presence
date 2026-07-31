import { Router, Request, Response } from 'express';
import { isValidLocationUpload } from '../domain/location';
import { getPool } from '../db';
import { runMatch, makeBucketEntry, RATE_LIMIT_MS } from '../domain/match';
import {
  getTokenRecord,
  upsertBucket,
  getActiveBucketsInCell,
  getFriendEdges,
  getRecentPushes,
  recordPush,
  getApnsTokens,
} from '../domain/repository';
import { isTokenValid } from '../domain/token';
import { getPushProvider } from '../platform/apns';

export const locationRouter = Router();

locationRouter.post('/', async (req: Request, res: Response) => {
  if (!isValidLocationUpload(req.body)) {
    res.status(400).json({ error: 'Invalid payload: ephemeralToken and geohash6 required' });
    return;
  }

  const { ephemeralToken, geohash6 } = req.body;
  const now = new Date();
  const pool = getPool();

  // Resolve the ephemeral token to a stable identity.
  const tokenRecord = await getTokenRecord(pool, ephemeralToken);
  if (!tokenRecord || !isTokenValid(tokenRecord, now)) {
    res.status(401).json({ error: 'Token not found or expired' });
    return;
  }
  const { identityId } = tokenRecord;

  const bucket = makeBucketEntry(identityId, geohash6, now);
  await upsertBucket(pool, identityId, geohash6, bucket.expiresAt);

  const [activeBuckets, friendEdges] = await Promise.all([
    getActiveBucketsInCell(pool, geohash6, now),
    getFriendEdges(pool, identityId),
  ]);

  const rateLimitSince = new Date(now.getTime() - RATE_LIMIT_MS);
  const candidateIdentities = [identityId, ...friendEdges.map((e) =>
    e.identityA === identityId ? e.identityB : e.identityA,
  )];
  const recentPushes = await getRecentPushes(pool, candidateIdentities, rateLimitSince);

  const { identitiesToNotify } = runMatch(
    identityId,
    geohash6,
    now,
    activeBuckets,
    friendEdges,
    recentPushes,
  );

  if (identitiesToNotify.length > 0) {
    const apnsTokenMap = await getApnsTokens(pool, identitiesToNotify);
    const push = getPushProvider();

    await Promise.all(
      identitiesToNotify.map(async (id) => {
        await recordPush(pool, id, now);
        const apnsToken = apnsTokenMap.get(id);
        if (apnsToken) {
          await push.sendSilentPush(apnsToken);
        }
      }),
    );
  }

  res.status(200).json({ ok: true, notified: identitiesToNotify.length });
});
