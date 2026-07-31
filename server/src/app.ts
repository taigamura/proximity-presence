import express from 'express';
import { locationRouter } from './routes/location';
import { inviteRouter } from './routes/invites';
import { friendsRouter } from './routes/friends';
import { tokensRouter } from './routes/tokens';
import { getPool } from './db';
import { SCHEMA_SQL } from './domain/schema';

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  await pool.query(SCHEMA_SQL);
}

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/tokens', tokensRouter);
  app.use('/location', locationRouter);
  app.use('/invites', inviteRouter);
  app.use('/friends', friendsRouter);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}
