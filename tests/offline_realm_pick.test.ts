// The offline lane boots ANY realm from ANY origin: the picker installs an
// explicit session override (setActiveRealmForOffline) that must outrank every
// weaker source — the origin included, because on infernal.crypticrealm.com
// nothing below the host in the resolution order could ever surface a
// different pick. It is session state, never persisted: clearing it must
// restore the origin's own resolution so an online session started after
// backing out of the offline panel can never render another realm's world.
import { afterEach, describe, expect, it } from 'vitest';
import {
  offlineRealmPick,
  resolveActiveRealmId,
  setActiveRealmForOffline,
  setRealmHostEnv,
} from '../src/sim/realms/registry';

const env = (host: string | null, stored: string | null, query: string | null = null) => ({
  queryParam: () => query,
  storageGet: () => stored,
  storageSet: () => {},
  hostRealmId: () => host,
});

afterEach(() => {
  setActiveRealmForOffline(null);
  setRealmHostEnv(null);
});

describe('offline realm pick precedence', () => {
  it('outranks the origin: the hub host boots infernal offline', () => {
    setRealmHostEnv(env('crypticrealm', null));
    setActiveRealmForOffline('infernal');
    expect(resolveActiveRealmId()).toBe('infernal');
  });

  it('outranks a realm host AND an explicit ?realm= link', () => {
    // The pick is the player's most recent, most explicit choice: a shareable
    // ?realm= link opened the page, but the offline picker was used after.
    setRealmHostEnv(env('infernal', 'crypticrealm', 'classic'));
    setActiveRealmForOffline('dominion');
    expect(resolveActiveRealmId()).toBe('dominion');
  });

  it('clearing restores the origin resolution exactly', () => {
    setRealmHostEnv(env('infernal', 'crypticrealm'));
    setActiveRealmForOffline('arcane');
    expect(resolveActiveRealmId()).toBe('arcane');
    setActiveRealmForOffline(null);
    expect(resolveActiveRealmId()).toBe('infernal');
  });

  it('is observable (offlineRealmPick) and null when no pick is live', () => {
    expect(offlineRealmPick()).toBeNull();
    setActiveRealmForOffline('classic');
    expect(offlineRealmPick()).toBe('classic');
    setActiveRealmForOffline(null);
    expect(offlineRealmPick()).toBeNull();
  });

  it('works with no host env at all (headless / packaged shell first boot)', () => {
    setRealmHostEnv(null);
    setActiveRealmForOffline('arcadevoid');
    expect(resolveActiveRealmId()).toBe('arcadevoid');
    setActiveRealmForOffline(null);
    expect(resolveActiveRealmId()).toBe('crypticrealm');
  });
});
