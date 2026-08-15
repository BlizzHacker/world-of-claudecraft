// Browser host environment for the headless realm registry (src/sim/realms).
// The sim must not touch window/localStorage (tests/architecture.test.ts), so
// the URL-query + storage reads and the stage-change DOM event live HERE and are
// injected via setRealmHostEnv. Self-installs on import when a DOM exists
// (browser + jsdom tests); Node/RL hosts never import this and keep the
// DEFAULT_REALM fallback. Import this module (for its side effect) from any UI
// module that resolves the active realm or stage.
import { setRealmHostEnv } from '../../sim/realms/registry';

// Hosts that serve the flagship realm but are not named after it. The apex and
// www are the landing origins; play.crypticrealm.com is the legacy alias that
// still routes to the same Cryptic Realm process.
const APEX_HOSTS = new Set([
  'crypticrealm.com',
  'www.crypticrealm.com',
  'play.crypticrealm.com',
]);

// Left over from the four-ring era. DNS records for beta-/alpha-/dev- hosts may
// outlive the rings themselves, so strip the prefix and resolve to the realm
// rather than failing to a default that renders the wrong world.
const STAGE_PREFIX_RE = /^(?:beta|alpha|dev)-/;

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
  if (APEX_HOSTS.has(host)) return 'crypticrealm';
  const label = (host.split('.')[0] ?? '').replace(STAGE_PREFIX_RE, '');
  // Bare IPs, localhost and www carry no realm: fall through to storage so a
  // dev hitting 127.0.0.1:8810 can still pick a realm by hand.
  if (!label || label === 'www' || label === 'localhost' || /^\d+$/.test(label)) return null;
  return label;
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
        return realmIdFromHostname(window.location.hostname);
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
        window.dispatchEvent(new CustomEvent('cr-realm-stage-change', { detail: { realmId, stage } }));
      } catch {
        /* no CustomEvent (non-DOM host) */
      }
    },
  });
}

installBrowserRealmEnv();
