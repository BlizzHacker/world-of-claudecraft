// Browser host environment for the headless realm registry (src/sim/realms).
// The sim must not touch window/localStorage (tests/architecture.test.ts), so
// the URL-query + storage reads and the stage-change DOM event live HERE and are
// injected via setRealmHostEnv. Self-installs on import when a DOM exists
// (browser + jsdom tests); Node/RL hosts never import this and keep the
// DEFAULT_REALM fallback. Import this module (for its side effect) from any UI
// module that resolves the active realm or stage.
import { isRealmId, setRealmHostEnv } from '../../sim/realms/registry';

/** Resolve the single-label live/stage host contract without accepting a
 * lookalike suffix. Apex and its beta/alpha/dev labels are Cryptic Realm;
 * themed stages use `<stage>-<realm>.crypticrealm.com`. */
export function realmIdForHostname(
  hostname: string,
): import('../../sim/realms/types').RealmId | null {
  const host = hostname.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  if (host === 'fps.moveweight.com') return 'fps';
  if (host === 'crypticrealm.com') return 'crypticrealm';
  const suffix = '.crypticrealm.com';
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null;
  if (
    label === 'www' ||
    label === 'play' ||
    label === 'beta' ||
    label === 'alpha' ||
    label === 'dev'
  ) {
    return 'crypticrealm';
  }
  const candidate = label.replace(/^(?:beta|alpha|dev)-/, '');
  return isRealmId(candidate) ? candidate : null;
}

/**
 * The realm id this ORIGIN serves, or null when the host names no realm.
 *
 * Inverse of stages.ts `stageHost`: every realm is a single-label host under
 * crypticrealm.com (`infernal.crypticrealm.com`), with the flagship on the
 * apex. Exported for tests; the sim never calls it directly — it arrives
 * through the RealmHostEnv seam below.
 */
export function realmIdFromHostname(rawHost: string | null | undefined): string | null {
  const host = (rawHost ?? '').trim().toLowerCase().replace(/:\d+$/, '');
  if (!host) return null;
  return realmIdForHostname(host);
}

export function installBrowserRealmEnv(): void {
  if (typeof window === 'undefined') return;
  setRealmHostEnv({
    queryParam: (name) => {
      try {
        return new URLSearchParams(window.location.search).get(name);
      } catch {
        return null;
      }
    },
    hostRealmId: () => {
      try {
        return realmIdForHostname(window.location.hostname);
      } catch {
        return null;
      }
    },
    storageGet: (key) => {
      try {
        return window.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    storageSet: (key, value) => {
      try {
        window.localStorage?.setItem(key, value);
      } catch {
        /* storage unavailable */
      }
    },
    notifyStageChange: (realmId, stage) => {
      try {
        window.dispatchEvent(
          new CustomEvent('cr-realm-stage-change', { detail: { realmId, stage } }),
        );
      } catch {
        /* no CustomEvent (non-DOM host) */
      }
    },
  });
}

installBrowserRealmEnv();
