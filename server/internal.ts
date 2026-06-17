import * as http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { json } from './http_util';
import type { GameServer } from './game';

function ok(res: http.ServerResponse, data: unknown): void {
  json(res, 200, { success: true, data, error: null });
}

function fail(res: http.ServerResponse, status: number, error: string, data: unknown = null): void {
  json(res, status, { success: false, data, error });
}

function secretsMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function handleInternalApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  game: GameServer,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method !== 'POST' || url.pathname !== '/internal/restart-countdown') {
    return fail(res, 404, 'unknown endpoint');
  }

  const expected = process.env.RESTART_COUNTDOWN_SECRET ?? '';
  if (!expected) return fail(res, 404, 'unknown endpoint');

  const actual = String(req.headers['x-woc-deploy-secret'] ?? '');
  if (!secretsMatch(actual, expected)) return fail(res, 401, 'not authenticated');

  const status = game.startRestartCountdown();
  if (!status.started) return fail(res, 409, 'restart countdown already active', status);
  ok(res, status);
}
