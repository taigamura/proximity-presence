import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { removeFriendEdge } from '../domain/repository';

export const friendsRouter = Router();

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
