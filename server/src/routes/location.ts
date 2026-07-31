import { Router, Request, Response } from 'express';
import { isValidLocationUpload } from '../domain/location';
import { getPool } from '../db';
import { runMatch, makeBucketEntry, RATE_LIMIT_MS } from '../domain/match';
import {
  upsertBucket,
  getActiveBucketsInCell,
  getFriendEdges,
  getRecentPushes,
  recordPush,
} from '../domain/repository';

export const locationRouter = Router();

locationRouter.post('/', async (req: Request, res: Response) => {
  if (!isValidLocationUpload(req.body)) {
    res.status(400).json({ error: 'Invalid payload: ephemeralToken and geohash6 required' });
    return;
  }

  const { ephemeralToken, geohash6 } = req.body;
  const now = new Date();
  const pool = getPool();

  const bucket = makeBucketEntry(ephemeralToken, geohash6, now);
  await upsertBucket(pool, ephemeralToken, geohash6, bucket.expiresAt);

  const [activeBuckets, friendEdges] = await Promise.all([
    getActiveBucketsInCell(pool, geohash6, now),
    getFriendEdges(pool, ephemeralToken),
  ]);

  const rateLimitSince = new Date(now.getTime() - RATE_LIMIT_MS);
  const candidateTokens = [ephemeralToken, ...friendEdges.map((e) =>
    e.tokenA === ephemeralToken ? e.tokenB : e.tokenA,
  )];
  const recentPushes = await getRecentPushes(pool, candidateTokens, rateLimitSince);

  const { tokensToNotify } = runMatch(
    ephemeralToken,
    geohash6,
    now,
    activeBuckets,
    friendEdges,
    recentPushes,
  );

  // Record pushes and dispatch (APNs dispatch stubbed until issue #4).
  await Promise.all(tokensToNotify.map((t) => recordPush(pool, t, now)));

  res.status(200).json({ ok: true, notified: tokensToNotify.length });
});
