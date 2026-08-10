import { describe, expect, it } from 'vitest';
import {
  isOfflineModeAvailable,
  isPackagedConsoleApp,
  PACKAGED_APP_HOST,
} from '../src/game/offline_mode_gate';

describe('isOfflineModeAvailable', () => {
  it('is available under dev builds', () => {
    expect(isOfflineModeAvailable(true)).toBe(true);
  });

  // FORK BEHAVIOUR, deliberately different from upstream. Upstream treats
  // offline as a dev convenience and closes it in production web. Cryptic Realm
  // SELLS it: the landing page says "explore solo offline" and the mode picker
  // offers an Offline entry, so closing it left players an Online-only dropdown
  // and a site making a promise the build would not keep.
  it('is available in production web builds on this fork', () => {
    expect(isOfflineModeAvailable(false)).toBe(true);
  });

  // The console package ships the whole client and is expected to run with no
  // network, so there is no server for the local Sim to undermine.
  it('is available in the packaged console app', () => {
    expect(isOfflineModeAvailable(false, true)).toBe(true);
  });

  it('is available regardless of how the two flags combine', () => {
    expect(isOfflineModeAvailable(false, false)).toBe(true);
    expect(isOfflineModeAvailable(true, true)).toBe(true);
  });
});

describe('isPackagedConsoleApp', () => {
  it('recognises the packaged virtual host', () => {
    expect(isPackagedConsoleApp(PACKAGED_APP_HOST)).toBe(true);
  });

  it('rejects every public host, including the live realms', () => {
    for (const h of [
      'crypticrealm.com',
      'infernal.crypticrealm.com',
      'localhost',
      'app.local.evil.com',
      'notapp.local',
      '',
    ]) {
      expect(isPackagedConsoleApp(h)).toBe(false);
    }
  });
});
