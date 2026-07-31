import { Router, Request, Response } from 'express';
import { isValidLocationUpload } from '../domain/location';

export const locationRouter = Router();

locationRouter.post('/', (req: Request, res: Response) => {
  if (!isValidLocationUpload(req.body)) {
    res.status(400).json({ error: 'Invalid payload: ephemeralToken and geohash6 required' });
    return;
  }
  // Stub: accept and acknowledge. Match engine wired in issue #3.
  res.status(200).json({ ok: true });
});
