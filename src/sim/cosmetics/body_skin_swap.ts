/**
 * The on-the-fly body-skin swap (the `set_body_skin` command body).
 *
 * One rule body for every host: the offline Sim calls it with grants built
 * from LOCAL meta (the entity's own level, no entitlements, the dev-commands
 * flag), the server calls it with the SAME account facts its join gate uses
 * (persisted level, bodySkinEntitlementsFor, the handshake staff identity).
 * Either way {@link authorizeBodySkin} is the only gate: nothing here may
 * bypass the level, entitlement, or per-class art checks, so a swap can never
 * put a body on an entity that a fresh join would strip back off.
 *
 * Command-driven and rng-free: no tick phase, no draws, no clock. Writes
 * exactly one field, `Entity.bodySkinId`, which rides the identity wire
 * (`bs`) online and the character save (`serializeCharacter`) everywhere.
 *
 * Refusals are English `ctx.error` literals re-localized client-side by
 * src/ui/sim_i18n.ts (EXACT rows); the S3 guard
 * (tests/localization_fixes.test.ts) scans this file, so a reworded literal
 * without its matcher row fails CI.
 */

import type { PlayerClass } from '../types';
import { authorizeBodySkin, type BodySkinGrantContext } from './body_skins';

/** The one sink this module needs; `Sim.ctx` satisfies it structurally. The
 *  parameter is named `ctx` at every call site so the S3 emit scanner sees
 *  the refusal literals. */
export interface BodySkinSwapCtx {
  error(pid: number, text: string): void;
}

/**
 * Apply a requested body-skin swap to a player entity, or refuse it.
 *
 * `requested` null clears back to the class body, which is always allowed
 * (base is the absence of a selection, never a grant). Returns whether the
 * entity's `bodySkinId` now matches the request.
 */
export function swapBodySkin(
  ctx: BodySkinSwapCtx,
  e: { id: number; kind: string; templateId: string; bodySkinId?: string | null },
  requested: string | null,
  grants: BodySkinGrantContext,
): boolean {
  if (e.kind !== 'player') return false;
  if (requested === null) {
    e.bodySkinId = null;
    return true;
  }
  const decision = authorizeBodySkin(requested, e.templateId as PlayerClass, grants);
  if (decision.skinId === null) {
    const denied = decision.denied ?? 'unknown';
    if (denied === 'level') ctx.error(e.id, 'You have not unlocked that appearance yet.');
    else if (denied === 'unowned') ctx.error(e.id, 'You do not own that appearance.');
    else if (denied === 'noArt') ctx.error(e.id, 'That appearance has no body for your class.');
    else ctx.error(e.id, 'That appearance does not exist.');
    return false;
  }
  e.bodySkinId = decision.skinId;
  return true;
}
