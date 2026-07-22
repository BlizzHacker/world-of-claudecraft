import { pool } from './db';

/**
 * Load one realm-editor document. SQL stays in this persistence shell; the
 * validation, revision, and publish rules live in server/realm_visuals.ts.
 */
export async function loadRealmVisualsState(key: string): Promise<unknown | null> {
  const result = await pool.query('SELECT data FROM world_state WHERE key = $1', [key]);
  return result.rows[0]?.data ?? null;
}

/**
 * Atomically transform one document across every realm process. The advisory
 * transaction lock closes the old load-then-save race: two ArcForge clients can
 * edit different assignments concurrently without the later writer erasing the
 * earlier one.
 */
export async function mutateRealmVisualsState<T>(
  key: string,
  transform: (current: unknown | null) => T,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    const current = await client.query('SELECT data FROM world_state WHERE key = $1', [key]);
    const next = transform(current.rows[0]?.data ?? null);
    await client.query(
      `INSERT INTO world_state (key, data, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [key, JSON.stringify(next)],
    );
    await client.query('COMMIT');
    return next;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
