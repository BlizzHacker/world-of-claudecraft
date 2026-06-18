// Fetch wrapper for the /me/api/* endpoints. Mirrors src/admin/api.ts so both
// dashboards share the same {success,data,error} envelope handling, just with
// different routes + token keys.

const TOKEN_KEY = 'cryptic-realm_user_token';
const NAME_KEY = 'cryptic-realm_user_name';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: Envelope<T> | null = null;
  try { body = await res.json(); } catch {
    throw new ApiError(res.status, `unexpected response (${res.status})`);
  }
  if (!res.ok || !body || body.success !== true || body.data === null) {
    throw new ApiError(res.status, body?.error ?? `request failed (${res.status})`);
  }
  return body.data;
}

export interface RoleFlags {
  isAdmin: boolean;
  isModerator: boolean;
}

export interface LoginData {
  token: string;
  username: string;
  roles: RoleFlags;
}

export interface SecurityData {
  totp: {
    enabled: boolean;
    configured: boolean;
  };
}

export interface TotpSetupData {
  secret: string;
  otpauthUrl: string;
}

export interface MyCharacter {
  id: number;
  name: string;
  class: string;
  level: number;
  realm: string;
  lifetimeXp: number;
}

export interface MeData {
  accountId: number;
  realm: string;
  roles: RoleFlags;
  moderation: {
    locked: boolean;
    message: string;
    chatMutedUntil: string | null;
  };
  characters: MyCharacter[];
}

export async function userLogin(username: string, password: string, totpCode = ''): Promise<LoginData> {
  const res = await fetch('/me/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, totpCode }),
  });
  const data = await parseEnvelope<LoginData>(res);
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(NAME_KEY, data.username);
  return data;
}

export async function getMe(): Promise<MeData> {
  const token = getToken();
  if (!token) throw new ApiError(401, 'not signed in');
  const res = await fetch('/me/api/me', { headers: { Authorization: `Bearer ${token}` } });
  return parseEnvelope<MeData>(res);
}

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new ApiError(401, 'not signed in');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(path, { ...init, headers });
  return parseEnvelope<T>(res);
}

export async function getSecurity(): Promise<SecurityData> {
  return authFetch<SecurityData>('/me/api/security');
}

export async function setupTotp(): Promise<TotpSetupData> {
  return authFetch<TotpSetupData>('/me/api/security/totp/setup', { method: 'POST', body: '{}' });
}

export async function enableTotp(code: string): Promise<SecurityData> {
  return authFetch<SecurityData>('/me/api/security/totp/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp(code: string): Promise<SecurityData> {
  return authFetch<SecurityData>('/me/api/security/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
