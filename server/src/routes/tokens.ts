import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { issueToken, generateIdentityId } from '../domain/token';
import { insertToken, purgeExpiredTokens, purgeExpiredBuckets } from '../domain/repository';

export const tokensRouter = Router();

/**
 * POST /tokens
 * Body: { identityId?: string }
 * If identityId is omitted a new one is generated (first-time registration).
 * Returns: { token, identityId, expiresAt }
 */
tokensRouter.post('/', async (req: Request, res: Response) => {
  const identityId: string =
    typeof req.body?.identityId === 'string' && req.body.identityId
      ? req.body.identityId
      : generateIdentityId();

  const now = new Date();
  const record = issueToken(identityId, now);
  await insertToken(getPool(), record);

  // Purge stale rows asynchronously — don't block the response.
  Promise.all([
    purgeExpiredTokens(getPool(), now),
    purgeExpiredBuckets(getPool(), now),
  ]).catch((err) => console.error('[tokens] purge failed:', err));

  res.status(201).json({
    token: record.token,
    identityId: record.identityId,
    expiresAt: record.expiresAt,
  });
});
