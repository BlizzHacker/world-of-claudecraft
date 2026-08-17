// PAID body-skin entitlements (server-only), the Famous Heroes shelf.
//
// Deliberately the SAME shape as server/homeowner_entitlement.ts rather than a
// second invention: Eastbrook Homes is the estate's existing paid-feature
// precedent, priced in $CR and gated on an account entitlement, and a cosmetic
// skin is the same transaction with a different product. Reusing the seam means
// the cr-solana settlement callback, when it is wired, writes ONE kind of row
// and both features read it.
//
// THE SETTLEMENT SEAM: an entitlement becomes true when the account's $CR
// payment clears on the exchange/custody side. That callback is not wired yet,
// so the same two explicit, auditable sources the homeowner gate uses exist
// here:
//   1. BODY_SKIN_ENTITLEMENTS: a comma-separated ops allowlist of
//      "entitlementId:name@realm" (or "entitlementId:name" for any realm), for
//      QA and manually settled purchases.
//   2. grantBodySkinEntitlement(): an in-process grant for the future
//      settlement callback and for server tests, never exposed to clients.
//
// Nothing here is persisted in character state: what a character WEARS is
// persisted, what it is ALLOWED to wear is recomputed from the account on every
// login, so a refund or a revocation takes effect at the next join.

const runtimeGrants = new Map<string, Set<string>>();

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function keysFor(name: string, realm: string): string[] {
  const n = normalize(name);
  return [`${n}@${normalize(realm)}`, n];
}

function envAllowlist(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const entry of (process.env.BODY_SKIN_ENTITLEMENTS ?? '').split(',')) {
    const cleaned = entry.trim();
    if (!cleaned) continue;
    const split = cleaned.indexOf(':');
    if (split <= 0) continue;
    const entitlementId = cleaned.slice(0, split).trim().toLowerCase();
    const who = normalize(cleaned.slice(split + 1));
    if (!entitlementId || !who) continue;
    const set = out.get(who) ?? new Set<string>();
    set.add(entitlementId);
    out.set(who, set);
  }
  return out;
}

/**
 * Every paid skin entitlement this character's account holds.
 *
 * The character row must already have passed account authentication before this
 * is called (the DuranceTester rule). Returns a plain array because it is fed
 * straight into authorizeBodySkin's pure context.
 */
export function bodySkinEntitlementsFor(name: string, realm: string): string[] {
  const allow = envAllowlist();
  const out = new Set<string>();
  for (const key of keysFor(name, realm)) {
    for (const id of runtimeGrants.get(key) ?? []) out.add(id);
    for (const id of allow.get(key) ?? []) out.add(id);
  }
  return [...out];
}

/** Grant a paid skin in-process (settlement callback / server tests).
 *  Pass realm '' to grant across realms. */
export function grantBodySkinEntitlement(entitlementId: string, name: string, realm = ''): void {
  const n = normalize(name);
  const key = realm ? `${n}@${normalize(realm)}` : n;
  const set = runtimeGrants.get(key) ?? new Set<string>();
  set.add(entitlementId.trim().toLowerCase());
  runtimeGrants.set(key, set);
}

/** Drop every in-process grant (test-only; the env allowlist is untouched). */
export function resetBodySkinEntitlementsForTests(): void {
  runtimeGrants.clear();
}
