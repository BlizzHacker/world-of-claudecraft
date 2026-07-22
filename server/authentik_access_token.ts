// Resolve an Authentik access token to an EXISTING linked Cryptic Realm
// account. This module is deliberately read-only: it never creates accounts,
// changes roles, or turns an external identity into a privileged session.

import { createHash } from 'node:crypto';
import { accountForOAuthIdentity } from './db';

const PROVIDER = 'authentik';
const MAX_TOKEN_BYTES = 16 * 1024;
const MAX_SUB_LENGTH = 512;
const CACHE_TTL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

interface AuthentikAccessTokenDeps {
  issuer: string;
  fetchImpl: typeof fetch;
  accountForIdentity(
    provider: string,
    sub: string,
  ): Promise<{ id: number; username: string } | null>;
  now(): number;
}

export interface AuthentikLinkedAccount {
  accountId: number;
  scope: 'full';
}

interface CachedResolution {
  expiresAt: number;
  account: AuthentikLinkedAccount | null;
}

interface OidcDiscovery {
  userinfo_endpoint?: unknown;
}

interface UserInfo {
  sub?: unknown;
}

function normalizedIssuer(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

function validHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit = {},
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      ...init,
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Dependency-injected resolver used by the realm-editor guard and tests. Raw
 * access tokens are never logged or retained; cache keys are SHA-256 digests. */
export function createAuthentikAccessTokenResolver(
  overrides: Partial<AuthentikAccessTokenDeps> & Pick<AuthentikAccessTokenDeps, 'issuer'>,
): (accessToken: string) => Promise<AuthentikLinkedAccount | null> {
  const deps: AuthentikAccessTokenDeps = {
    fetchImpl: fetch,
    accountForIdentity: accountForOAuthIdentity,
    now: Date.now,
    ...overrides,
    issuer: normalizedIssuer(overrides.issuer),
  };
  const cache = new Map<string, CachedResolution>();
  const inflight = new Map<string, Promise<AuthentikLinkedAccount | null>>();
  let userinfoEndpoint: string | null | undefined;
  let discoveryInflight: Promise<string | null> | null = null;

  async function discoverUserinfo(): Promise<string | null> {
    if (userinfoEndpoint !== undefined) return userinfoEndpoint;
    if (discoveryInflight) return discoveryInflight;
    discoveryInflight = (async () => {
      if (!deps.issuer) return null;
      const raw = await fetchJson(
        deps.fetchImpl,
        `${deps.issuer}/.well-known/openid-configuration`,
      );
      const endpoint = validHttpUrl((raw as OidcDiscovery | null)?.userinfo_endpoint);
      userinfoEndpoint = endpoint;
      return endpoint;
    })();
    try {
      return await discoveryInflight;
    } finally {
      discoveryInflight = null;
    }
  }

  return async (accessToken: string): Promise<AuthentikLinkedAccount | null> => {
    if (
      !deps.issuer ||
      typeof accessToken !== 'string' ||
      accessToken.length < 16 ||
      Buffer.byteLength(accessToken, 'utf8') > MAX_TOKEN_BYTES
    ) {
      return null;
    }

    const digest = createHash('sha256').update(accessToken).digest('hex');
    const cached = cache.get(digest);
    if (cached && cached.expiresAt > deps.now()) return cached.account;
    const pending = inflight.get(digest);
    if (pending) return pending;

    const resolution = (async (): Promise<AuthentikLinkedAccount | null> => {
      const endpoint = await discoverUserinfo();
      if (!endpoint) return null;
      const raw = await fetchJson(deps.fetchImpl, endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sub = (raw as UserInfo | null)?.sub;
      if (typeof sub !== 'string' || sub.length === 0 || sub.length > MAX_SUB_LENGTH) return null;
      const account = await deps.accountForIdentity(PROVIDER, sub);
      return account ? { accountId: account.id, scope: 'full' } : null;
    })();
    inflight.set(digest, resolution);
    try {
      const account = await resolution;
      cache.set(digest, { expiresAt: deps.now() + CACHE_TTL_MS, account });
      return account;
    } finally {
      inflight.delete(digest);
    }
  };
}

const REAL_RESOLVER = createAuthentikAccessTokenResolver({
  issuer: process.env.AUTHENTIK_ISSUER ?? '',
});

export async function accountForAuthentikAccessToken(
  accessToken: string,
): Promise<AuthentikLinkedAccount | null> {
  return REAL_RESOLVER(accessToken);
}
