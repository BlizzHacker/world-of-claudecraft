// The shared localStorage feature-detect every persisted-toggle pure core needs
// (guild_hide_offline.ts, party_collapse.ts, and any future one like them): probe
// for localStorage without throwing when it is unavailable (SSR, a locked-down
// browser, or a test environment with no Storage global at all), and hand back
// null rather than a broken reference so a caller's own try/catch stays the only
// place that has to reason about a missing key or a write that fails.
//
// This module is the ONE place allowed to reach `localStorage` in value position
// (`typeof localStorage !== 'undefined' ? localStorage : null`): the purity guard
// (tests/architecture.test.ts) allowlists exactly this file for that idiom, since
// DOM_GLOBAL_RE (member access only) cannot see it and every OTHER pure core is
// expected to go through here instead of re-probing on its own.

/**
 * Returns the real `localStorage` when it exists and is reachable, or null when it
 * is unavailable (SSR/no browser) or a read throws (storage disabled, private-mode
 * quota lockouts on some browsers). Callers still wrap their own getItem/setItem in
 * try/catch: a storage object handed back here can still throw on individual calls.
 */
export function safeLocalStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

// The total-function form, for a caller that only wants one key and has no
// meaningful fallback to run in a catch. Both halves have to be covered: the
// probe above answers "can I reach the object", and these answer "can I reach
// the value", which is a separate failure (a blocked third-party context throws
// on the reference, private mode throws on the write, a partitioned context
// simply has nothing). A caller that needs to TELL those apart still uses
// safeLocalStorage() plus its own try/catch; these are for the far more common
// site that would only ever write `catch { /* noop */ }` anyway, which is
// exactly where a bare `localStorage.getItem(...)` keeps getting written
// instead.

/** The stored value for `key`, or null when storage or the key is unreachable. */
export function readLocalStorage(key: string): string | null {
  try {
    return safeLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Persist `value` under `key`. Returns whether it actually landed. */
export function writeLocalStorage(key: string, value: string): boolean {
  try {
    const storage = safeLocalStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Best-effort delete of `key`. */
export function removeLocalStorage(key: string): void {
  try {
    safeLocalStorage()?.removeItem(key);
  } catch {
    /* nothing to undo: the key is unreachable either way */
  }
}
