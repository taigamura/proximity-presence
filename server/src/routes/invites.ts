import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { createInvite, validateAccept } from '../domain/invite';
import { insertInvite, getInvite, acceptInvite } from '../domain/repository';

export const inviteRouter = Router();

/**
 * POST /invites
 * Body: { creatorToken: string }
 * Returns: { code, secret, expiresAt }
 * The secret is returned once — the creator shares it out-of-band.
 */
inviteRouter.post('/', async (req: Request, res: Response) => {
  const { creatorToken } = req.body ?? {};
  if (typeof creatorToken !== 'string' || !creatorToken) {
    res.status(400).json({ error: 'creatorToken required' });
    return;
  }

  const now = new Date();
  const { code, secret, hashedSecret, expiresAt } = createInvite(creatorToken, now);
  await insertInvite(getPool(), code, creatorToken, hashedSecret, expiresAt);

  res.status(201).json({ code, secret, expiresAt });
});

/**
 * POST /invites/:code/accept
 * Body: { acceptorToken: string, secret: string }
 * Returns: { ok: true } or 4xx with reason.
 */
inviteRouter.post('/:code/accept', async (req: Request, res: Response) => {
  const { code } = req.params;
  const { acceptorToken, secret } = req.body ?? {};

  if (typeof acceptorToken !== 'string' || !acceptorToken ||
      typeof secret !== 'string' || !secret) {
    res.status(400).json({ error: 'acceptorToken and secret required' });
    return;
  }

  const pool = getPool();
  const now = new Date();
  const invite = await getInvite(pool, code);
  const result = validateAccept(invite, acceptorToken, secret, now);

  if (!result.ok) {
    const status =
      result.reason === 'not_found' ? 404 :
      result.reason === 'already_used' ? 409 :
      result.reason === 'expired' ? 410 :
      400; // bad_secret, self_invite
    res.status(status).json({ error: result.reason });
    return;
  }

  await acceptInvite(pool, code, invite!.creatorToken, acceptorToken, now);
  res.status(200).json({ ok: true });
});
