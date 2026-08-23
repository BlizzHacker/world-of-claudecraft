// Facebook Instant Games context detection. The Facebook bundle (built by
// scripts/build_facebook_bundle.mjs, hosted on FB Web Hosting) runs the REAL
// game client in the bundle page alongside the FBInstant SDK, so two signals
// fire there: the shell seeds the sessionStorage flag before the game module
// executes, and the FBInstant global is visible in the same page. The fb=1
// query param remains a supported dev/testing entry, and a hit is persisted
// to sessionStorage so SPA navigation that drops the param keeps the context.
//
// FACEBOOK_APP mirrors the NATIVE_APP gate pattern (src/client_origin.ts): a
// module-scope const src/main.ts consults to keep surfaces Facebook policy
// does not allow (the $CR wallet, daily rewards, off-platform purchases)
// hidden inside the Facebook container. See docs/facebook-release.md.

export const FACEBOOK_QUERY_PARAM = 'fb';
export const FACEBOOK_CONTEXT_STORAGE_KEY = 'cr_facebook_shell';

export interface FacebookContextSignals {
  /** location.search, with or without the leading question mark. */
  search: string;
  /** sessionStorage value under FACEBOOK_CONTEXT_STORAGE_KEY, null when unset. */
  storedFlag: string | null;
  /** Whether an FBInstant global is present in this page. */
  hasFbInstant: boolean;
}

/** Pure detection core (tests/facebook_context.test.ts). */
export function detectFacebookContext(signals: FacebookContextSignals): boolean {
  if (signals.hasFbInstant) return true;
  if (signals.storedFlag === '1') return true;
  if (!signals.search) return false;
  return new URLSearchParams(signals.search).get(FACEBOOK_QUERY_PARAM) === '1';
}

function readStoredFlag(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(FACEBOOK_CONTEXT_STORAGE_KEY) ?? null;
  } catch {
    return null; // storage blocked (privacy mode): treat as unset
  }
}

function persistFlag(): void {
  try {
    globalThis.sessionStorage?.setItem(FACEBOOK_CONTEXT_STORAGE_KEY, '1');
  } catch {
    // Storage blocked: detection still works while the param is present.
  }
}

/** Impure wrapper: read the live signals once and persist a hit. */
export function resolveFacebookAppContext(): boolean {
  const detected = detectFacebookContext({
    search: typeof location !== 'undefined' ? location.search : '',
    storedFlag: readStoredFlag(),
    hasFbInstant: (globalThis as { FBInstant?: unknown }).FBInstant !== undefined,
  });
  if (detected) persistFlag();
  return detected;
}

/** True inside the Facebook Instant Games container, resolved once at boot. */
export const FACEBOOK_APP = resolveFacebookAppContext();
