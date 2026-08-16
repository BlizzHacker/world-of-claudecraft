import { createHash } from 'node:crypto';
import type * as http from 'node:http';
import { recordSitePresenceBatch, type SitePresenceInput } from './admin_db';
import { json, readBody } from './http_util';
import { requestIp } from './ratelimit';

const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{16,80}$/;
const PAGE_RE = /^[a-z0-9][a-z0-9/_-]{0,63}$/;

export function cleanSiteVisitorId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return VISITOR_ID_RE.test(trimmed) ? trimmed : null;
}

export function cleanSitePresencePage(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9/_-]/g, '-');
  return PAGE_RE.test(normalized) ? normalized.slice(0, 64) : 'unknown';
}

export function hashPresenceText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

// ---------------------------------------------------------------------------
// Write coalescing. The beacon used to do one INSERT..ON CONFLICT per request,
// awaited inside the handler, which put the public heartbeat on the pg pool's
// critical path: during the 2026-08-16 event-loop-starvation incident every
// beacon burned a pool checkout for up to the full connect timeout and then
// surfaced the pg error as a 500 burst — while ALSO deepening the very pool
// queue that character loads and saves were dying in. The endpoint is
// fire-and-forget telemetry (the client's fetch has .catch(() => {})), and its
// consumer (currentSitePresenceUsers) reads a 2-minute last_seen window against
// a 45s client cadence, so a short server-side coalesce is invisible to it.
// Heartbeats now land in an in-memory buffer keyed by visitor id (the upsert's
// conflict key, so the Map also guarantees one VALUES row per visitor — a
// duplicate key in one multi-row upsert is an ON CONFLICT error) and flush as a
// single statement every SITE_PRESENCE_FLUSH_MS. The handler itself never
// touches the DB: a DB outage sheds one flush batch and logs (throttled),
// instead of answering 500 to a beacon nobody reads the answer of.
// ---------------------------------------------------------------------------

const SITE_PRESENCE_FLUSH_MS = 5_000;
// Bounds handler-side memory if the flush loop is starved or the endpoint is
// flooded with fabricated visitor ids: new visitors past the cap are shed (the
// next heartbeat 45s later lands once the buffer drained). Far above the
// concurrent-visitor count the 2-minute presence window has ever seen.
const SITE_PRESENCE_MAX_BUFFERED = 4096;

const pendingPresence = new Map<string, SitePresenceInput>();
let presenceFlushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPresenceFlushErrorLogAt = 0;

function schedulePresenceFlush(): void {
  if (presenceFlushTimer !== null) return;
  presenceFlushTimer = setTimeout(() => {
    presenceFlushTimer = null;
    void flushSitePresence();
  }, SITE_PRESENCE_FLUSH_MS);
  // A pending telemetry flush must never hold the process open on shutdown.
  presenceFlushTimer.unref?.();
}

/** Buffer one validated heartbeat; the flush timer arms lazily so an idle ring
 *  with no site traffic runs no timer at all. */
export function queueSitePresence(input: SitePresenceInput): void {
  if (pendingPresence.size >= SITE_PRESENCE_MAX_BUFFERED && !pendingPresence.has(input.visitorId)) {
    return; // shed: bounded memory beats a perfect sample (see cap comment)
  }
  pendingPresence.set(input.visitorId, input);
  schedulePresenceFlush();
}

/** Drain the buffer into one multi-row upsert. Exported for tests and callable
 *  directly; the timer path swallows (and throttled-logs) DB failures because
 *  shedding a 5s window of telemetry is the correct behavior under DB pressure. */
export async function flushSitePresence(): Promise<void> {
  if (pendingPresence.size === 0) return;
  const batch = [...pendingPresence.values()];
  pendingPresence.clear();
  try {
    await recordSitePresenceBatch(batch);
  } catch (err) {
    const now = Date.now();
    if (now - lastPresenceFlushErrorLogAt > 60_000) {
      lastPresenceFlushErrorLogAt = now;
      console.error(`site presence flush failed (${batch.length} heartbeats shed):`, err);
    }
  }
}

/** Test hook: drop buffered heartbeats + the armed timer so tests stay isolated. */
export function resetSitePresenceForTests(): void {
  pendingPresence.clear();
  if (presenceFlushTimer !== null) {
    clearTimeout(presenceFlushTimer);
    presenceFlushTimer = null;
  }
  lastPresenceFlushErrorLogAt = 0;
}

export async function handleSitePresenceHeartbeat(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method not allowed' });
  const body = await readBody(req, 1024);
  const visitorId = cleanSiteVisitorId(body.visitorId);
  if (!visitorId) return json(res, 400, { ok: false, error: 'invalid visitor id' });
  queueSitePresence({
    visitorId,
    page: cleanSitePresencePage(body.page),
    ipHash: hashPresenceText(requestIp(req)),
    userAgentHash: hashPresenceText(String(req.headers['user-agent'] ?? '')),
  });
  return json(res, 200, { ok: true });
}
