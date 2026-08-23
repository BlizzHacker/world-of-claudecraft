// The shared localStorage feature-detect (src/ui/safe_local_storage.ts) that every
// persisted-toggle pure core imports instead of duplicating its own copy
// (guild_hide_offline.ts, party_collapse.ts). This is the one pure core the purity
// guard (tests/architecture.test.ts) allowlists for the value-position
// `typeof localStorage` idiom; this suite proves the function itself behaves
// correctly under Node, where `localStorage` is not a global at all.

import { afterEach, describe, expect, it } from 'vitest';
import {
  readLocalStorage,
  removeLocalStorage,
  safeLocalStorage,
  writeLocalStorage,
} from '../src/ui/safe_local_storage';

describe('safeLocalStorage (the shared feature-detect)', () => {
  it('returns null under Node, where localStorage is not a global (no throw)', () => {
    // This test file itself runs in plain Node (no jsdom), so this exercises the
    // exact "unavailable" branch every caller relies on: no ReferenceError, just null.
    expect(safeLocalStorage()).toBeNull();
  });

  it('returns the real localStorage when the global exists and is reachable', () => {
    const fake = { getItem: () => null, setItem: () => undefined } as unknown as Storage;
    (globalThis as { localStorage?: Storage }).localStorage = fake;
    try {
      expect(safeLocalStorage()).toBe(fake);
    } finally {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  it('returns null (never throws) when reading the global itself throws', () => {
    // Some locked-down environments throw on the `localStorage` reference itself
    // (not just on getItem/setItem), which is exactly what the try/catch guards.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('access denied');
      },
    });
    try {
      expect(() => safeLocalStorage()).not.toThrow();
      expect(safeLocalStorage()).toBeNull();
    } finally {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });
});

// The total-function wrappers the client entry uses. They exist because the
// probe only covers half the hazard: a blocked third-party context (the
// Facebook Instant Games iframe) throws on the localStorage REFERENCE, while
// private mode and quota lockouts throw on the individual call.
describe('readLocalStorage / writeLocalStorage / removeLocalStorage', () => {
  const install = (storage: unknown): void => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => storage,
    });
  };

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('round-trips a key through a working store', () => {
    const box = new Map<string, string>();
    install({
      getItem: (k: string) => box.get(k) ?? null,
      setItem: (k: string, v: string) => void box.set(k, v),
      removeItem: (k: string) => void box.delete(k),
    });

    expect(writeLocalStorage('woc_last_realm', 'Eastbrook')).toBe(true);
    expect(readLocalStorage('woc_last_realm')).toBe('Eastbrook');
    removeLocalStorage('woc_last_realm');
    expect(readLocalStorage('woc_last_realm')).toBeNull();
  });

  it('reports a missing key as null rather than undefined', () => {
    install({ getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    expect(readLocalStorage('nothing_here')).toBeNull();
  });

  it('answers without throwing when the global itself throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('access denied');
      },
    });
    expect(readLocalStorage('k')).toBeNull();
    expect(writeLocalStorage('k', 'v')).toBe(false);
    expect(() => removeLocalStorage('k')).not.toThrow();
  });

  it('answers without throwing when an individual call throws (quota, private mode)', () => {
    install({
      getItem: () => {
        throw new Error('read blocked');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readLocalStorage('k')).toBeNull();
    expect(writeLocalStorage('k', 'v')).toBe(false);
    expect(() => removeLocalStorage('k')).not.toThrow();
  });

  it('answers under Node, where there is no Storage global at all', () => {
    expect(readLocalStorage('k')).toBeNull();
    expect(writeLocalStorage('k', 'v')).toBe(false);
    expect(() => removeLocalStorage('k')).not.toThrow();
  });
});
