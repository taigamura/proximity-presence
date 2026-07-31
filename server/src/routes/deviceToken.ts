import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { getTokenRecord } from '../domain/repository';
import { isTokenValid } from '../domain/token';
import { upsertDeviceToken } from '../domain/repository';

export const deviceTokenRouter = Router();

/**
 * POST /device-token
 * Body: { ephemeralToken: string, apnsToken: string }
 * Resolves the ephemeral token to an identity, then registers/updates the APNs token.
 */
deviceTokenRouter.post('/', async (req: Request, res: Response) => {
  const { ephemeralToken, apnsToken } = req.body ?? {};

  if (typeof ephemeralToken !== 'string' || !ephemeralToken ||
      typeof apnsToken !== 'string' || !apnsToken) {
    res.status(400).json({ error: 'ephemeralToken and apnsToken required' });
    return;
  }

  const now = new Date();
  const pool = getPool();
  const tokenRecord = await getTokenRecord(pool, ephemeralToken);

  if (!tokenRecord || !isTokenValid(tokenRecord, now)) {
    res.status(401).json({ error: 'Token not found or expired' });
    return;
  }

  await upsertDeviceToken(pool, tokenRecord.identityId, apnsToken);
  res.status(200).json({ ok: true });
});
