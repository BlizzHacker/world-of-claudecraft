// THE dev/admin grant for the appearance tiers (server-only).
//
// The operator, 2026-08-17: "Make it so my characters can level to 99 and have
// all characters unlocked (i'm the dev)". The tempting way to deliver that is to
// lower UNLOCKED_SKIN_LEVEL or to honour a flag the client sends. Both are
// refused here: the first hands the tier to every player, and the second is not
// a grant at all, it is a request. So the grant is an explicit, server-resolved
// property of the ACCOUNT, resolved from the database on every read that depends
// on it and never accepted from the wire.
//
// WHY THE STAFF-IDENTITY CHECK AND NOT THE RAW is_admin COLUMN. Two admin
// notions exist in this server: the raw `accounts.is_admin` flag that
// accountRoleFlags reports to /me/api/me (what the in-game "Edit Bodies (admin)"
// button gates on), and the staff identity adminRolesForAccount computes, which
// is `is_admin AND at least one entry in accounts.admin_roles`. This module uses
// the second because:
//   1. It is the FAIL-CLOSED one. effectiveAdminRoles (server/staff_db.ts)
//      documents is_admin as the kill switch: setting it FALSE forces zero roles
//      whatever admin_roles says, and a stale is_admin TRUE with no roles reads
//      as no powers rather than as every power. A cosmetic grant should inherit
//      that direction, not the permissive one.
//   2. It is ALREADY the value the WebSocket handshake computes and stamps on
//      the session as `isAdmin` (server/ws_auth.ts -> ClientSession.isAdmin), so
//      the world join and these HTTP routes ask exactly the same question. Two
//      spellings of "is this the dev" is how a picker starts offering something
//      the world then takes away.
// For the operator's own account the two agree (account 1, MOVEWEIGHT: is_admin
// true, admin_roles {superadmin}), so the stricter choice costs him nothing.
//
// WHY IT CANNOT BE SPOOFED. Nothing a client sends is read here. The account id
// comes from the authenticated request context (ctxAccountId) or from the
// authenticated WS handshake, the roles come from a fresh SELECT, and the answer
// is recomputed at each of the three places a skin can be authorized: the
// character list, the selection write, and every world join. A non-dev client
// that fabricates the flag in its own copy of the pure grant context changes
// only which chips its own picker draws bright; its write is refused and its
// join authorizes it back down to the base body, so no peer ever sees it.

import { adminRolesForAccount } from './staff_db';

/**
 * True when this account is staff, i.e. holds the dev/admin appearance grant:
 * every unlocked family regardless of level, and every premium family
 * regardless of entitlement.
 *
 * The caller must already have authenticated the account (the DuranceTester
 * rule). Failures resolve to false rather than throwing: a database hiccup must
 * degrade to "not a dev", never to a 500 on the character list.
 */
export async function isDevAccount(accountId: number): Promise<boolean> {
  try {
    return (await adminRolesForAccount(accountId)) !== null;
  } catch {
    return false;
  }
}
