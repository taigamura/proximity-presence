import express from 'express';
import { locationRouter } from './routes/location';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/location', locationRouter);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}
