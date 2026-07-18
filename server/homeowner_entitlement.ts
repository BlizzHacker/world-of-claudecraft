// Eastbrook Homes PAID entitlement (server-only). Housing is a premium
// feature, never a minigame: a deed on Homestead Lane costs $CR, and buying
// in-game is gated on this entitlement being present on the account.
//
// THE SETTLEMENT SEAM: the entitlement becomes true when the account's $CR
// deed payment clears on the exchange/custody side (the cr-solana pipeline).
// That settlement callback is NOT wired here yet — when it lands it should
// write the account entitlement row this module reads. Until then two
// explicit, auditable sources exist:
//   1. HOMEOWNER_CHARACTERS: a comma-separated ops allowlist ("name@realm" or
//      bare "name" for any realm), for QA and manually-settled purchases.
//   2. grantHomeownerEntitlement(): an in-process grant used by the future
//      settlement callback (and by server tests), never exposed to clients.
// The sim's PlayerMeta.homeownerEntitled is a runtime mirror of this check at
// login; nothing about the entitlement is persisted in character state.

const runtimeGrants = new Set<string>();

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function envAllowlist(): Set<string> {
  const raw = process.env.HOMEOWNER_CHARACTERS ?? '';
  const out = new Set<string>();
  for (const entry of raw.split(',')) {
    const cleaned = entry.trim().toLowerCase();
    if (cleaned) out.add(cleaned);
  }
  return out;
}

/**
 * True when this character's account holds the paid Eastbrook Homes
 * entitlement. The character row must already have passed account
 * authentication before this predicate is called (the DuranceTester rule).
 */
export function isHomeownerCharacter(name: string, realm: string): boolean {
  const n = normalize(name);
  const key = `${n}@${normalize(realm)}`;
  if (runtimeGrants.has(key) || runtimeGrants.has(n)) return true;
  const allow = envAllowlist();
  return allow.has(key) || allow.has(n);
}

/** Grant the entitlement in-process (settlement callback / server tests).
 *  Pass realm '' to grant across realms. */
export function grantHomeownerEntitlement(name: string, realm = ''): void {
  const n = normalize(name);
  runtimeGrants.add(realm ? `${n}@${normalize(realm)}` : n);
}
