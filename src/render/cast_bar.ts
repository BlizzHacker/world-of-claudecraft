// Pure presentation logic for the overhead spell cast/channel bar. Kept DOM-free
// (and free of i18n: no t()/tEntity here) so the fill + label rules stay
// unit-testable without a WebGL context. The renderer turns this into DOM and
// resolves the visible text (fishing label vs. ability name) via i18n.
import { Entity, FISHING_CAST_ID } from '../sim/types';

export interface CastBarState {
  /** whether the bar should be shown at all this frame */
  visible: boolean;
  /** channels drain (true); hardcasts fill toward completion (false) */
  channel: boolean;
  /** 0..1 width fraction — casts grow toward 1, channels shrink toward 0 */
  fill: number;
  /**
   * Stable discriminator for the renderer to localize, never display text:
   * the raw castingAbility id (an ABILITIES key, or an unknown id rendered
   * verbatim). When `fishing` is true this is the fishing cast id.
   */
  label: string;
  /** the cast is the fishing channel → renderer shows the localized fishing label */
  fishing: boolean;
}

const HIDDEN: CastBarState = { visible: false, channel: false, fill: 0, label: '', fishing: false };

export function castBarState(e: Entity): CastBarState {
  // corpses, doors/crates, and idle entities show nothing; guard the divide too
  if (e.dead || e.kind === 'object' || !e.castingAbility || e.castTotal <= 0) return HIDDEN;
  const remaining = Math.max(0, Math.min(1, e.castRemaining / e.castTotal));
  const fill = e.channeling ? remaining : 1 - remaining;
  return {
    visible: true,
    channel: e.channeling,
    fill,
    label: e.castingAbility,
    fishing: e.castingAbility === FISHING_CAST_ID,
  };
}
