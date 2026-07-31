import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { removeFriendEdge } from '../domain/repository';

export const friendsRouter = Router();

/**
 * DELETE /friends/:friendToken
 * Header: x-user-token: <callerToken>
 * Removes the edge between caller and friendToken (block / remove).
 */
friendsRouter.delete('/:friendToken', async (req: Request, res: Response) => {
  const callerToken = req.headers['x-user-token'];
  const { friendToken } = req.params;

  if (typeof callerToken !== 'string' || !callerToken) {
    res.status(400).json({ error: 'x-user-token header required' });
    return;
  }
  if (callerToken === friendToken) {
    res.status(400).json({ error: 'cannot remove yourself' });
    return;
  }

  await removeFriendEdge(getPool(), callerToken, friendToken);
  res.status(200).json({ ok: true });
});
