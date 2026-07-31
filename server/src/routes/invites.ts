import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { createInvite, validateAccept } from '../domain/invite';
import { insertInvite, getInvite, acceptInvite } from '../domain/repository';

export const inviteRouter = Router();

/**
 * POST /invites
 * Body: { creatorIdentity: string }
 * Returns: { code, secret, expiresAt }
 * The secret is returned once — the creator shares it out-of-band with the invitee.
 */
inviteRouter.post('/', async (req: Request, res: Response) => {
  const { creatorIdentity } = req.body ?? {};
  if (typeof creatorIdentity !== 'string' || !creatorIdentity) {
    res.status(400).json({ error: 'creatorIdentity required' });
    return;
  }

  const now = new Date();
  const { code, secret, hashedSecret, expiresAt } = createInvite(creatorIdentity, now);
  await insertInvite(getPool(), code, creatorIdentity, hashedSecret, expiresAt);

  res.status(201).json({ code, secret, expiresAt });
});

/**
 * POST /invites/:code/accept
 * Body: { acceptorIdentity: string, secret: string }
 * Returns: { ok: true } or 4xx with reason.
 */
inviteRouter.post('/:code/accept', async (req: Request, res: Response) => {
  const { code } = req.params;
  const { acceptorIdentity, secret } = req.body ?? {};

  if (typeof acceptorIdentity !== 'string' || !acceptorIdentity ||
      typeof secret !== 'string' || !secret) {
    res.status(400).json({ error: 'acceptorIdentity and secret required' });
    return;
  }

  const pool = getPool();
  const now = new Date();
  const invite = await getInvite(pool, code);
  const result = validateAccept(invite, acceptorIdentity, secret, now);

  if (!result.ok) {
    const status =
      result.reason === 'not_found' ? 404 :
      result.reason === 'already_used' ? 409 :
      result.reason === 'expired' ? 410 :
      400;
    res.status(status).json({ error: result.reason });
    return;
  }

  await acceptInvite(pool, code, invite!.creatorToken, acceptorIdentity, now);
  res.status(200).json({ ok: true });
});
