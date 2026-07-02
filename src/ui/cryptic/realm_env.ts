// Browser host environment for the headless realm registry (src/sim/realms).
// The sim must not touch window/localStorage (tests/architecture.test.ts), so
// the URL-query + storage reads and the stage-change DOM event live HERE and are
// injected via setRealmHostEnv. Self-installs on import when a DOM exists
// (browser + jsdom tests); Node/RL hosts never import this and keep the
// DEFAULT_REALM fallback. Import this module (for its side effect) from any UI
// module that resolves the active realm or stage.
import { setRealmHostEnv } from '../../sim/realms/registry';

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
