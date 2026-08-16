import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The hanging-database guard. Point the pool at a TCP endpoint that ACCEPTS the
// connection but never completes the Postgres startup handshake (it never sends a
// byte). The pool's connectionTimeoutMillis (DB_POOL_CONNECT_TIMEOUT_MS) must
// then fail the query fast, so a slow or black-holed database degrades into
// isolated query failures instead of a process-wide stall. Real pg here, no mock:
// the connect-timeout wiring only exists in the real driver. The timeout is
// env-tunable (default 12s, sized to ride out event-loop starvation bursts —
// see server/db.ts); this suite pins the ENV WIRING by setting 5000 before the
// module loads, keeping the timing bracket tight.

let server: net.Server;
const held: net.Socket[] = [];
let db: typeof import('../../server/db');

beforeAll(async () => {
  server = net.createServer((sock) => {
    // Accept and hold the socket open; never write a byte, so the pg startup never
    // completes and only the connect timeout can end the wait. Swallow the reset
    // the driver sends when it destroys its side after the timeout fires, so an
    // unhandled 'error' cannot fault the suite.
    sock.on('error', () => {});
    held.push(sock);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  // Set the URL BEFORE importing db.ts: it reads DATABASE_URL and builds the Pool
  // at module load. loadEnvFile never overrides an already-set env var, so the real
  // .env cannot replace this black-hole URL. Same moment for the connect timeout:
  // 5000 keeps the assertion bracket below tight AND proves the env knob reaches
  // connectionTimeoutMillis (the default is 12000; an ignored knob would blow the
  // 9000ms ceiling).
  process.env.DATABASE_URL = `postgres://user:pass@127.0.0.1:${port}/db`;
  process.env.DB_POOL_CONNECT_TIMEOUT_MS = '5000';
  db = await import('../../server/db');
});

afterAll(async () => {
  for (const sock of held) sock.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  // A parked connect attempt could keep pool.end() from settling; race it with a
  // short timer so the suite can never hang on teardown.
  const ended = db.pool.end().then(() => 'ended' as const);
  const timed = new Promise<'timer'>((resolve) => {
    setTimeout(() => resolve('timer'), 3000).unref();
  });
  const which = await Promise.race([ended, timed]);
  if (which === 'timer') {
    console.warn('db_pool_timeout: pool.end() did not settle within 3s (parked connect)');
  }
});

describe('db pool connect timeout', () => {
  it('rejects a query with a timeout when the database accepts but never answers', async () => {
    const start = Date.now();
    let error: Error | undefined;
    try {
      await db.pool.query('SELECT 1');
    } catch (e) {
      error = e as Error;
    }
    const elapsed = Date.now() - start;

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toMatch(/timeout/i);
    // Proves the configured 5000ms connect timeout fired: not an instant failure
    // (which would mean the pool never waited for the handshake) and not an
    // indefinite hang (no timeout at all). The window brackets the one 5000ms
    // timer with slack for CI.
    expect(elapsed).toBeGreaterThanOrEqual(4500);
    expect(elapsed).toBeLessThanOrEqual(9000);
  }, 20000);

  it('parses DB_POOL_CONNECT_TIMEOUT_MS like the sibling pool knobs: digits in range, else the 12s default', () => {
    // Same accept/fall-back contract as parseDbPoolMaxClients: only a plain
    // whole number inside the bounds takes; everything else lands on the
    // default so a typo can never run an unintended timeout silently.
    expect(db.parseDbPoolConnectTimeoutMs('5000')).toBe(5000);
    expect(db.parseDbPoolConnectTimeoutMs('1000')).toBe(1000);
    // The ceiling sits strictly under the 15s ordinary statement timeout so an
    // env value can never invert the fail-fastest ladder (the deployed .env
    // carried 30000 while the knob was hardcoded and silently ignored).
    expect(db.parseDbPoolConnectTimeoutMs('14000')).toBe(14_000);
    expect(db.parseDbPoolConnectTimeoutMs('14001')).toBe(12_000); // over max
    expect(db.parseDbPoolConnectTimeoutMs('30000')).toBe(12_000); // the .env value: rejected, logged
    expect(db.parseDbPoolConnectTimeoutMs(undefined)).toBe(12_000);
    expect(db.parseDbPoolConnectTimeoutMs('')).toBe(12_000);
    expect(db.parseDbPoolConnectTimeoutMs('999')).toBe(12_000); // under min
    expect(db.parseDbPoolConnectTimeoutMs('5e3')).toBe(12_000); // exponent spelling
    expect(db.parseDbPoolConnectTimeoutMs('-5000')).toBe(12_000);
    expect(db.parseDbPoolConnectTimeoutMs('nope')).toBe(12_000);
  });
});
