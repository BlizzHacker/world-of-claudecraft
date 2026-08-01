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

  it('is disabled in production web builds', () => {
    expect(isOfflineModeAvailable(false)).toBe(false);
  });

  // The console package ships the whole client and is expected to run with no
  // network, so there is no server for the local Sim to undermine.
  it('is available in the packaged console app', () => {
    expect(isOfflineModeAvailable(false, true)).toBe(true);
  });

  // The exception must stay scoped: a production web build is still closed.
  it('stays closed for production web even though the console exception exists', () => {
    expect(isOfflineModeAvailable(false, false)).toBe(false);
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
