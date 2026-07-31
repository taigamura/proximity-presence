import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { getTokenRecord, deleteAccount } from '../domain/repository';
import { isTokenValid } from '../domain/token';

export const accountRouter = Router();

/**
 * DELETE /account
 * Header: Authorization: Bearer <ephemeralToken>
 *
 * Deletes all data stored for the identity linked to the supplied token.
 * Satisfies GDPR Art. 17 / Japan APPI right-to-erasure requirement.
 *
 * Returns 200 { ok: true } on success.
 * Returns 401 if the token is missing, unknown, or expired.
 */
accountRouter.delete('/', async (req: Request, res: Response) => {
  const auth = req.headers['authorization'];
  const ephemeralToken =
    typeof auth === 'string' && auth.startsWith('Bearer ')
      ? auth.slice(7)
      : undefined;

  if (!ephemeralToken) {
    res.status(401).json({ error: 'Authorization: Bearer <token> required' });
    return;
  }

  const now = new Date();
  const pool = getPool();
  const tokenRecord = await getTokenRecord(pool, ephemeralToken);

  if (!tokenRecord || !isTokenValid(tokenRecord, now)) {
    res.status(401).json({ error: 'Token not found or expired' });
    return;
  }

  await deleteAccount(pool, tokenRecord.identityId);
  res.status(200).json({ ok: true });
});
