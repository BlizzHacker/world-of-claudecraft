// Pure derivation of how many combo-point pips to light over an entity's
// nameplate. Combo points belong to the *local player* and are anchored to a
// specific target (`comboTargetId`); the renderer draws them over whichever
// entity matches. Kept DOM/Three-free so it can be unit-tested directly.
import { Entity } from '../sim/types';

// Combo points cap at 5 in the sim (Sim.addComboPoints).
export const COMBO_PIP_MAX = 5;

// Pips to show over `e` given the viewing player's combo state. Zero unless the
// player has points built on this exact entity and it is still alive; clamped
// into [0, COMBO_PIP_MAX] so a transient overshoot never overflows the row.
export function comboPipsFor(player: Entity, e: Entity): number {
  if (player.comboTargetId !== e.id || e.dead) return 0;
  return Math.max(0, Math.min(COMBO_PIP_MAX, player.comboPoints));
}
