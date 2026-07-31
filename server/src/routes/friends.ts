import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { removeFriendEdge, getFriendCount, getFriendIdentities } from '../domain/repository';
import { MIN_FRIENDS_FOR_PUSH } from '../domain/match';

export const friendsRouter = Router();

/**
 * GET /friends
 * Header: x-identity-id: <identityId>
 * Returns { friends: string[] } — the list of friend identity IDs.
 */
friendsRouter.get('/', async (req: Request, res: Response) => {
  const identityId = req.headers['x-identity-id'];
  if (typeof identityId !== 'string' || !identityId) {
    res.status(400).json({ error: 'x-identity-id header required' });
    return;
  }
  const friends = await getFriendIdentities(getPool(), identityId);
  res.status(200).json({ friends });
});

/**
 * GET /friends/count
 * Header: x-identity-id: <identityId>
 * Returns { count, meetsGate } where meetsGate is true when count >= MIN_FRIENDS_FOR_PUSH.
 */
friendsRouter.get('/count', async (req: Request, res: Response) => {
  const identityId = req.headers['x-identity-id'];
  if (typeof identityId !== 'string' || !identityId) {
    res.status(400).json({ error: 'x-identity-id header required' });
    return;
  }
  const count = await getFriendCount(getPool(), identityId);
  res.status(200).json({ count, meetsGate: count >= MIN_FRIENDS_FOR_PUSH });
});

/**
 * DELETE /friends/:friendIdentity
 * Header: x-identity-id: <callerIdentity>
 * Removes the edge between caller and friendIdentity (block / remove).
 */
friendsRouter.delete('/:friendIdentity', async (req: Request, res: Response) => {
  const callerIdentity = req.headers['x-identity-id'];
  const { friendIdentity } = req.params;

  if (typeof callerIdentity !== 'string' || !callerIdentity) {
    res.status(400).json({ error: 'x-identity-id header required' });
    return;
  }
  if (callerIdentity === friendIdentity) {
    res.status(400).json({ error: 'cannot remove yourself' });
    return;
  }

  await removeFriendEdge(getPool(), callerIdentity, friendIdentity);
  res.status(200).json({ ok: true });
});
