import { pool } from './db';

// Read-side queries for the admin dashboard. All inputs are parameterized;
// sort columns are whitelisted before they reach SQL.

export interface OverviewCounts {
  accounts: number;
  characters: number;
  accountsToday: number;
  accountsWeek: number;
  sessionsToday: number;
  activeAccountsToday: number;
}

export async function overviewCounts(): Promise<OverviewCounts> {
  const res = await pool.query(`
    SELECT
      (SELECT count(*) FROM accounts)::int                                              AS accounts,
      (SELECT count(*) FROM characters)::int                                            AS characters,
      (SELECT count(*) FROM accounts WHERE created_at > now() - interval '1 day')::int  AS accounts_today,
      (SELECT count(*) FROM accounts WHERE created_at > now() - interval '7 days')::int AS accounts_week,
      (SELECT count(*) FROM play_sessions WHERE started_at > now() - interval '1 day')::int                  AS sessions_today,
      (SELECT count(DISTINCT account_id) FROM play_sessions WHERE started_at > now() - interval '1 day')::int AS active_accounts_today
  `);
  const r = res.rows[0];
  return {
    accounts: r.accounts,
    characters: r.characters,
    accountsToday: r.accounts_today,
    accountsWeek: r.accounts_week,
    sessionsToday: r.sessions_today,
    activeAccountsToday: r.active_accounts_today,
  };
}

export interface DayPoint {
  day: string;
  count: number;
}

export async function registrationsByDay(days: number): Promise<DayPoint[]> {
  const res = await pool.query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
     FROM accounts
     WHERE created_at > now() - ($1 || ' days')::interval
     GROUP BY 1 ORDER BY 1`,
    [String(days)],
  );
  return res.rows;
}

export interface SessionDayPoint {
  day: string;
  sessions: number;
  uniqueAccounts: number;
  playtimeSeconds: number;
}

export async function sessionsByDay(days: number): Promise<SessionDayPoint[]> {
  const res = await pool.query(
    `SELECT
       to_char(date_trunc('day', started_at), 'YYYY-MM-DD') AS day,
       count(*)::int AS sessions,
       count(DISTINCT account_id)::int AS unique_accounts,
       COALESCE(sum(EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))), 0)::bigint AS playtime_seconds
     FROM play_sessions
     WHERE started_at > now() - ($1 || ' days')::interval
     GROUP BY 1 ORDER BY 1`,
    [String(days)],
  );
  return res.rows.map((r) => ({
    day: r.day,
    sessions: r.sessions,
    uniqueAccounts: r.unique_accounts,
    playtimeSeconds: Number(r.playtime_seconds),
  }));
}

export interface BucketCount {
  key: string;
  count: number;
}

export async function classDistribution(): Promise<BucketCount[]> {
  const res = await pool.query(
    `SELECT class AS key, count(*)::int AS count FROM characters GROUP BY class ORDER BY count DESC`,
  );
  return res.rows;
}

export async function levelDistribution(): Promise<BucketCount[]> {
  const res = await pool.query(
    `SELECT level::text AS key, count(*)::int AS count FROM characters GROUP BY level ORDER BY level`,
  );
  return res.rows;
}

// Escape LIKE wildcards in user-supplied search text so "%" matches a literal
// percent sign instead of everything.
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export interface AdminAccountRow {
  id: number;
  username: string;
  createdAt: string;
  lastLogin: string | null;
  isAdmin: boolean;
  bannedAt: string | null;
  suspendedUntil: string | null;
  characterCount: number;
  maxLevel: number;
  playtimeSeconds: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export async function listAccounts(search: string, page: number, limit: number): Promise<Paginated<AdminAccountRow>> {
  const pattern = search ? `%${escapeLike(search)}%` : '%';
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    pool.query(
      `SELECT a.id, a.username, a.created_at, a.last_login, a.is_admin,
              a.banned_at, a.suspended_until,
              count(c.id)::int AS character_count,
              COALESCE(max(c.level), 0)::int AS max_level,
              COALESCE((SELECT sum(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, now()) - s.started_at)))
                        FROM play_sessions s WHERE s.account_id = a.id), 0)::bigint AS playtime_seconds
       FROM accounts a
       LEFT JOIN characters c ON c.account_id = a.id
       WHERE a.username ILIKE $1
       GROUP BY a.id
       ORDER BY a.id DESC
       LIMIT $2 OFFSET $3`,
      [pattern, limit, offset],
    ),
    pool.query(`SELECT count(*)::int AS total FROM accounts WHERE username ILIKE $1`, [pattern]),
  ]);
  return {
    rows: rows.rows.map((r) => ({
      id: r.id,
      username: r.username,
      createdAt: r.created_at,
      lastLogin: r.last_login,
      isAdmin: r.is_admin,
      bannedAt: r.banned_at,
      suspendedUntil: r.suspended_until,
      characterCount: r.character_count,
      maxLevel: r.max_level,
      playtimeSeconds: Number(r.playtime_seconds),
    })),
    total: total.rows[0].total,
    page,
    limit,
  };
}

export interface AdminCharacterRow {
  id: number;
  name: string;
  class: string;
  level: number;
  accountId: number;
  username: string;
  copper: number;
  xp: number;
  createdAt: string;
  updatedAt: string;
}

const CHARACTER_SORT_COLUMNS: Record<string, string> = {
  id: 'c.id',
  name: 'c.name',
  class: 'c.class',
  level: 'c.level',
  created_at: 'c.created_at',
  updated_at: 'c.updated_at',
};

export async function listCharacters(
  sort: string,
  dir: 'asc' | 'desc',
  page: number,
  limit: number,
): Promise<Paginated<AdminCharacterRow>> {
  const column = CHARACTER_SORT_COLUMNS[sort] ?? 'c.level';
  const direction = dir === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name, c.class, c.level, c.account_id, a.username,
              COALESCE((c.state->>'copper')::bigint, 0) AS copper,
              COALESCE((c.state->>'xp')::bigint, 0) AS xp,
              c.created_at, c.updated_at
       FROM characters c
       JOIN accounts a ON a.id = c.account_id
       ORDER BY ${column} ${direction}, c.id
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    pool.query(`SELECT count(*)::int AS total FROM characters`),
  ]);
  return {
    rows: rows.rows.map((r) => ({
      id: r.id,
      name: r.name,
      class: r.class,
      level: r.level,
      accountId: r.account_id,
      username: r.username,
      copper: Number(r.copper),
      xp: Number(r.xp),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total: total.rows[0].total,
    page,
    limit,
  };
}

export interface AccountDetail {
  id: number;
  username: string;
  createdAt: string;
  lastLogin: string | null;
  isAdmin: boolean;
  bannedAt: string | null;
  suspendedUntil: string | null;
  moderationReason: string;
  playtimeSeconds: number;
  characters: {
    id: number;
    name: string;
    class: string;
    level: number;
    copper: number;
    xp: number;
    pos: { x: number; z: number } | null;
    createdAt: string;
    updatedAt: string;
  }[];
  recentSessions: {
    id: number;
    characterName: string;
    startedAt: string;
    endedAt: string | null;
    seconds: number;
  }[];
}

export async function accountDetail(accountId: number): Promise<AccountDetail | null> {
  const [account, characters, sessions] = await Promise.all([
    pool.query(
      `SELECT id, username, created_at, last_login, is_admin, banned_at, suspended_until,
              COALESCE(moderation_reason, '') AS moderation_reason,
              COALESCE((SELECT sum(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, now()) - s.started_at)))
                        FROM play_sessions s WHERE s.account_id = accounts.id), 0)::bigint AS playtime_seconds
       FROM accounts WHERE id = $1`,
      [accountId],
    ),
    pool.query(
      `SELECT id, name, class, level,
              COALESCE((state->>'copper')::bigint, 0) AS copper,
              COALESCE((state->>'xp')::bigint, 0) AS xp,
              state->'pos' AS pos, created_at, updated_at
       FROM characters WHERE account_id = $1 ORDER BY level DESC, id`,
      [accountId],
    ),
    pool.query(
      `SELECT id, character_name, started_at, ended_at,
              EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at))::bigint AS seconds
       FROM play_sessions WHERE account_id = $1 ORDER BY started_at DESC LIMIT 20`,
      [accountId],
    ),
  ]);
  const a = account.rows[0];
  if (!a) return null;
  return {
    id: a.id,
    username: a.username,
    createdAt: a.created_at,
    lastLogin: a.last_login,
    isAdmin: a.is_admin,
    bannedAt: a.banned_at,
    suspendedUntil: a.suspended_until,
    moderationReason: a.moderation_reason,
    playtimeSeconds: Number(a.playtime_seconds),
    characters: characters.rows.map((c) => ({
      id: c.id,
      name: c.name,
      class: c.class,
      level: c.level,
      copper: Number(c.copper),
      xp: Number(c.xp),
      pos: c.pos && typeof c.pos.x === 'number' && typeof c.pos.z === 'number' ? { x: c.pos.x, z: c.pos.z } : null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    recentSessions: sessions.rows.map((s) => ({
      id: s.id,
      characterName: s.character_name,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      seconds: Number(s.seconds),
    })),
  };
}
