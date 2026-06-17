import * as http from 'node:http';
import { json, readBody } from './http_util';
import { rateLimited } from './ratelimit';
import { findAccount, touchLogin, saveToken, accountForToken, isAdminAccount } from './db';
import { verifyPassword, newToken } from './auth';
import {
  overviewCounts, registrationsByDay, sessionsByDay, classDistribution, levelDistribution,
  listAccounts, listCharacters, accountDetail,
} from './admin_db';
import {
  forceCharacterRename, ignoreReport, moderateAccount, muteAccountChat, moderationQueue, moderationReportsForAccount,
} from './moderation_db';
import {
  addFilterWord, chatModeratedAccounts, chatModerationForAccount, getFilterConfig, liftChatMute,
  listFilterWords, removeFilterWord, resetChatStrikes, updateFilterConfig, type WordTier,
} from './chat_filter_db';
import type { GameServer } from './game';

// Admin API: everything under /admin/api/*. Auth is a bearer token whose
// account has is_admin = TRUE — the admin.* hostname is routing, not security.

const ADMIN_LOGIN_MAX_PER_MINUTE = 10;
const MAX_PAGE_LIMIT = 200;
const DEFAULT_PAGE_LIMIT = 25;
const ACTIVITY_WINDOW_DAYS = 30;

function ok(res: http.ServerResponse, data: unknown): void {
  json(res, 200, { success: true, data, error: null });
}

function fail(res: http.ServerResponse, status: number, error: string): void {
  json(res, status, { success: false, data: null, error });
}

export interface PageParams {
  page: number;
  limit: number;
}

export function parsePageParams(params: URLSearchParams): PageParams {
  const rawPage = Number(params.get('page') ?? '1');
  const rawLimit = Number(params.get('limit') ?? String(DEFAULT_PAGE_LIMIT));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(rawLimit)))
    : DEFAULT_PAGE_LIMIT;
  return { page, limit };
}

function cleanTier(value: unknown): WordTier | null {
  return value === 'soft' || value === 'hard' ? value : null;
}

async function adminAccountId(req: http.IncomingMessage): Promise<number | null> {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  const accountId = await accountForToken(m[1]);
  if (accountId === null) return null;
  return (await isAdminAccount(accountId)) ? accountId : null;
}

async function handleLogin(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (rateLimited(req, ADMIN_LOGIN_MAX_PER_MINUTE)) {
    return fail(res, 429, 'too many attempts — wait a minute and try again');
  }
  const body = await readBody(req);
  const account = typeof body.username === 'string' ? await findAccount(body.username) : null;
  if (!account || !(await verifyPassword(String(body.password ?? ''), account.password_hash))) {
    return fail(res, 401, 'invalid username or password');
  }
  if (!(await isAdminAccount(account.id))) {
    return fail(res, 403, 'this account does not have admin access');
  }
  await touchLogin(account.id);
  const token = newToken();
  await saveToken(token, account.id);
  ok(res, { token, username: account.username });
}

export async function handleAdminApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  game: GameServer,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  try {
    if (req.method === 'POST' && path === '/admin/api/login') {
      return await handleLogin(req, res);
    }

    const accountId = await adminAccountId(req);
    if (accountId === null) return fail(res, 401, 'admin authentication required');

    const actionMatch = /^\/admin\/api\/moderation\/accounts\/(\d+)\/(suspend|ban|unban)$/.exec(path);
    if (req.method === 'POST' && actionMatch) {
      const targetAccountId = Number(actionMatch[1]);
      const action = actionMatch[2] as 'suspend' | 'ban' | 'unban';
      if (action !== 'unban' && await isAdminAccount(targetAccountId)) {
        return fail(res, 400, 'admin accounts cannot be suspended or banned');
      }
      const body = await readBody(req);
      try {
        await moderateAccount({
          accountId: targetAccountId,
          adminAccountId: accountId,
          action,
          reason: body.reason,
          expiresAt: body.expiresAt,
        });
        if (action !== 'unban') {
          const statusText = action === 'ban' ? 'This account has been banned.' : 'This account is suspended.';
          game.disconnectAccount(targetAccountId, statusText);
        }
        return ok(res, { ok: true });
      } catch (err) {
        return fail(res, 400, err instanceof Error ? err.message : 'moderation action failed');
      }
    }
    const chatMuteMatch = /^\/admin\/api\/moderation\/accounts\/(\d+)\/chat-mute$/.exec(path);
    if (req.method === 'POST' && chatMuteMatch) {
      const targetAccountId = Number(chatMuteMatch[1]);
      if (await isAdminAccount(targetAccountId)) {
        return fail(res, 400, 'admin accounts cannot be chat muted');
      }
      const body = await readBody(req);
      try {
        await muteAccountChat({
          accountId: targetAccountId,
          adminAccountId: accountId,
          reason: body.reason,
          expiresAt: body.expiresAt,
        });
        game.muteAccountChat(targetAccountId, String(body.expiresAt ?? ''), String(body.reason ?? ''));
        return ok(res, { ok: true });
      } catch (err) {
        return fail(res, 400, err instanceof Error ? err.message : 'chat mute failed');
      }
    }
    const ignoreMatch = /^\/admin\/api\/moderation\/reports\/(\d+)\/ignore$/.exec(path);
    if (req.method === 'POST' && ignoreMatch) {
      const body = await readBody(req);
      const ignored = await ignoreReport(Number(ignoreMatch[1]), accountId, body.note);
      return ignored ? ok(res, { ok: true }) : fail(res, 404, 'open report not found');
    }
    const forceRenameMatch = /^\/admin\/api\/moderation\/characters\/(\d+)\/force-rename$/.exec(path);
    if (req.method === 'POST' && forceRenameMatch) {
      const body = await readBody(req);
      try {
        const result = await forceCharacterRename({
          characterId: Number(forceRenameMatch[1]),
          adminAccountId: accountId,
          reason: body.reason,
        });
        game.disconnectAccount(result.accountId, 'A moderator requires one of your characters to be renamed.');
        return ok(res, { ok: true });
      } catch (err) {
        return fail(res, 400, err instanceof Error ? err.message : 'force rename failed');
      }
    }

    // Chat filter: lift mute / reset strikes for an account.
    const liftMuteMatch = /^\/admin\/api\/moderation\/accounts\/(\d+)\/lift-mute$/.exec(path);
    if (req.method === 'POST' && liftMuteMatch) {
      const id = Number(liftMuteMatch[1]);
      const lifted = await liftChatMute(id);
      if (lifted) game.liftChatMuteLive(id);
      return lifted ? ok(res, { ok: true }) : fail(res, 404, 'account not found');
    }
    const resetStrikesMatch = /^\/admin\/api\/moderation\/accounts\/(\d+)\/reset-strikes$/.exec(path);
    if (req.method === 'POST' && resetStrikesMatch) {
      const id = Number(resetStrikesMatch[1]);
      const reset = await resetChatStrikes(id);
      if (reset) game.resetChatStrikesLive(id);
      return reset ? ok(res, { ok: true }) : fail(res, 404, 'account not found');
    }

    // Chat filter: word list + escalation config management. Every edit reloads
    // the live filter and pushes the new soft list to connected clients.
    if (req.method === 'POST' && path === '/admin/api/chat-filter/words') {
      const body = await readBody(req);
      const tier = cleanTier(body.tier);
      if (!tier) return fail(res, 400, 'tier must be "soft" or "hard"');
      const added = await addFilterWord(body.word, tier);
      if (!added) return fail(res, 400, 'word is empty after normalization');
      await game.reloadChatFilter();
      return ok(res, { ok: true });
    }
    const wordDeleteMatch = /^\/admin\/api\/chat-filter\/words\/(\d+)\/delete$/.exec(path);
    if (req.method === 'POST' && wordDeleteMatch) {
      const removed = await removeFilterWord(Number(wordDeleteMatch[1]));
      if (removed) await game.reloadChatFilter();
      return removed ? ok(res, { ok: true }) : fail(res, 404, 'word not found');
    }
    if (req.method === 'POST' && path === '/admin/api/chat-filter/config') {
      const body = await readBody(req);
      const config = await updateFilterConfig({
        warningsBeforeMute: body.warningsBeforeMute,
        muteLadderSeconds: body.muteLadderSeconds,
      });
      await game.reloadChatFilter();
      return ok(res, config);
    }

    if (req.method !== 'GET') return fail(res, 405, 'method not allowed');

    if (path === '/admin/api/chat-filter') {
      const [soft, hard, config, accounts] = await Promise.all([
        listFilterWords('soft'),
        listFilterWords('hard'),
        getFilterConfig(),
        chatModeratedAccounts(),
      ]);
      return ok(res, { soft, hard, config, accounts });
    }

    if (path === '/admin/api/overview') {
      const counts = await overviewCounts();
      return ok(res, { ...counts, server: game.adminStats() });
    }
    if (path === '/admin/api/online') {
      return ok(res, { players: game.liveSessions() });
    }
    if (path === '/admin/api/activity') {
      const [registrations, sessions, classes, levels] = await Promise.all([
        registrationsByDay(ACTIVITY_WINDOW_DAYS),
        sessionsByDay(ACTIVITY_WINDOW_DAYS),
        classDistribution(),
        levelDistribution(),
      ]);
      return ok(res, { days: ACTIVITY_WINDOW_DAYS, registrations, sessions, classes, levels });
    }
    if (path === '/admin/api/accounts') {
      const { page, limit } = parsePageParams(url.searchParams);
      const search = (url.searchParams.get('search') ?? '').slice(0, 64);
      return ok(res, await listAccounts(search, page, limit));
    }
    if (path === '/admin/api/moderation/queue') {
      return ok(res, { rows: await moderationQueue(game.liveAccountIds()) });
    }
    const moderationAccountMatch = /^\/admin\/api\/moderation\/accounts\/(\d+)$/.exec(path);
    if (moderationAccountMatch) {
      const id = Number(moderationAccountMatch[1]);
      const [detail, reports, chat] = await Promise.all([
        accountDetail(id),
        moderationReportsForAccount(id),
        chatModerationForAccount(id),
      ]);
      if (!detail) return fail(res, 404, 'account not found');
      return ok(res, { account: detail, reports, chat });
    }
    const detailMatch = /^\/admin\/api\/accounts\/(\d+)$/.exec(path);
    if (detailMatch) {
      const detail = await accountDetail(Number(detailMatch[1]));
      if (!detail) return fail(res, 404, 'account not found');
      return ok(res, detail);
    }
    if (path === '/admin/api/characters') {
      const { page, limit } = parsePageParams(url.searchParams);
      const sort = url.searchParams.get('sort') ?? 'level';
      const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
      return ok(res, await listCharacters(sort, dir, page, limit));
    }

    fail(res, 404, 'unknown admin endpoint');
  } catch (err) {
    console.error('admin api error:', err);
    fail(res, 500, 'internal error');
  }
}
