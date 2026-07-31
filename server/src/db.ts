import { Pool, PoolClient } from 'pg';

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgres://localhost:5432/proximity_presence',
    });
  }
  return _pool;
}

/** Replace the pool — used in tests to inject a mock/test pool. */
export function setPool(pool: Pool | null): void {
  _pool = pool;
}

export type { Pool, PoolClient };
