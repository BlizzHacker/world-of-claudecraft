import { describe, expect, it, vi } from 'vitest';
import { createAuthentikAccessTokenResolver } from '../server/authentik_access_token';

const TOKEN = 'authentik-access-token-for-tests';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Authentik access-token resolver', () => {
  it('resolves only an existing linked account and caches by token digest', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ userinfo_endpoint: 'https://auth.example.test/application/o/userinfo/' }),
      )
      .mockResolvedValueOnce(jsonResponse({ sub: 'authentik-subject' }));
    const accountForIdentity = vi.fn(async () => ({ id: 41, username: 'moveweight' }));
    const resolve = createAuthentikAccessTokenResolver({
      issuer: 'https://auth.example.test/application/o/cryptic-realm/',
      fetchImpl,
      accountForIdentity,
      now: () => 1_000,
    });

    await expect(resolve(TOKEN)).resolves.toEqual({ accountId: 41, scope: 'full' });
    await expect(resolve(TOKEN)).resolves.toEqual({ accountId: 41, scope: 'full' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(accountForIdentity).toHaveBeenCalledWith('authentik', 'authentik-subject');
    expect(accountForIdentity).toHaveBeenCalledTimes(1);
  });

  it('fails closed for invalid tokens, unlinked identities, and failed userinfo', async () => {
    const accountForIdentity = vi.fn(async () => null);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({ userinfo_endpoint: 'https://auth.example.test/application/o/userinfo/' }),
      )
      .mockResolvedValueOnce(jsonResponse({ sub: 'unlinked-subject' }));
    const resolve = createAuthentikAccessTokenResolver({
      issuer: 'https://auth.example.test/application/o/cryptic-realm',
      fetchImpl,
      accountForIdentity,
      now: () => 2_000,
    });

    await expect(resolve('short')).resolves.toBeNull();
    await expect(resolve(TOKEN)).resolves.toBeNull();
    expect(accountForIdentity).toHaveBeenCalledWith('authentik', 'unlinked-subject');

    const failed = createAuthentikAccessTokenResolver({
      issuer: 'https://auth.example.test/application/o/cryptic-realm',
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 401)),
      accountForIdentity,
      now: () => 3_000,
    });
    await expect(failed(`${TOKEN}-failed`)).resolves.toBeNull();
  });
});
