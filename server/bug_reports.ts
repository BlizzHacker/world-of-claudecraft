// Bug-report sink. Alpha/beta/dev testers submit timestamped diagnostics (url,
// realm, player pos, perf, gamepad status, a canvas screenshot, and their note)
// from the in-game Report Bug button. We persist each as a JSON file under a
// reviewable directory + append a one-line index so the dev loop can scan them.
//
// Not in Postgres: screenshots are large base64 blobs and these are append-only
// dev feedback, so a file sink keeps them out of the gameplay DB and easy to tail.
import * as fs from 'node:fs';
import * as path from 'node:path';

const DIR = process.env.CR_BUG_REPORT_DIR ?? '/var/log/cryptic-realm-bug-reports';
const INDEX = path.join(DIR, 'index.log');
const MAX_BYTES = 6 * 1024 * 1024; // reject absurdly large payloads (screenshot cap)

export interface BugReportInput {
  note?: string;
  url?: string;
  realmId?: string;
  realmName?: string;
  capturedAt?: string;
  userAgent?: string;
  viewport?: unknown;
  player?: unknown;
  network?: unknown;
  performance?: unknown;
  gamepad?: unknown;
  screenshot?: string | null;
}

function ensureDir(): void {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch { /* may already exist / perms */ }
}

/** Persist a bug report. Returns its id, or null if it couldn't be written. */
export function saveBugReport(input: BugReportInput, meta: { accountId: number | null; realm: string }): string | null {
  const raw = JSON.stringify(input);
  if (raw.length > MAX_BYTES) return null;
  ensureDir();
  const ts = new Date();
  const id = `bug-${ts.toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    id,
    receivedAt: ts.toISOString(),
    accountId: meta.accountId,
    serverRealm: meta.realm,
    note: typeof input.note === 'string' ? input.note.slice(0, 4000) : '',
    url: input.url ?? '',
    realmId: input.realmId ?? '',
    realmName: input.realmName ?? '',
    capturedAt: input.capturedAt ?? '',
    userAgent: input.userAgent ?? '',
    viewport: input.viewport ?? null,
    player: input.player ?? null,
    network: input.network ?? null,
    performance: input.performance ?? null,
    gamepad: input.gamepad ?? null,
    hasScreenshot: !!input.screenshot,
    screenshot: typeof input.screenshot === 'string' ? input.screenshot : null,
  };
  try {
    fs.writeFileSync(path.join(DIR, `${id}.json`), JSON.stringify(record));
    // One-line index entry (no screenshot) for quick scanning / tailing.
    const line = JSON.stringify({
      id, receivedAt: record.receivedAt, serverRealm: meta.realm,
      realmName: record.realmName, note: record.note.slice(0, 200),
      url: record.url, hasScreenshot: record.hasScreenshot, accountId: meta.accountId,
    }) + '\n';
    fs.appendFileSync(INDEX, line);
    return id;
  } catch {
    return null;
  }
}
