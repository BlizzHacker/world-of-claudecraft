// Eastbrook Homes: the premium housing domain (src/sim/homes_layout.ts).
// NOT a minigame — deeds are priced in $CR and gated on the account's PAID
// homeowner entitlement (PlayerMeta.homeownerEntitled, set server-side from
// the account record when the $CR purchase clears on the exchange/custody
// side; see server/homeowner_entitlement.ts). The sim validates the flag,
// records ownership, and answers the readout; it never touches the chain.
//
// State stays on Sim as ONE holder object (`Sim.homes`, a live `ctx.homes`
// view). Ownership is plain serializable data: the server persists the
// holder's lots record through its world-state store after every purchase.
//
// Determinism: ZERO rng draws anywhere in this module.

import type { HomesInfo } from '../../world_api/homes';
import { NPCS } from '../data';
import { createNpc } from '../entity';
import { HOME_LOTS, HOME_PRICE_CR, isAtHomes, REALTOR_POS } from '../homes_layout';
import type { SimContext } from '../sim_context';
import { dist2d } from '../types';

export const HOMES_REALTOR_NPC_ID = 'realtor_maribel';
// Reserved entity id outside the nextId sequence (Bram/Pip/Grott precedent).
export const HOMES_REALTOR_ID = 1_000_000_003;
export const HOMES_BUY_RANGE = 14; // yd from the Realtor or a lot door to sign

export interface HomeOwnership {
  owner: string; // character name (display + one-per-character rule)
  characterId: number | null; // durable id when the server knows it
  at: number; // sim time of purchase (server: persisted as-is)
}

export interface HomesState {
  /** lotId -> ownership; a missing key means the plot is for sale. Plain
   *  serializable data: the server round-trips this record verbatim. */
  lots: Record<string, HomeOwnership>;
}

export function createHomesState(): HomesState {
  return { lots: {} };
}

export function spawnRealtor(ctx: SimContext): void {
  const def = NPCS[HOMES_REALTOR_NPC_ID];
  if (!def || ctx.entities.has(HOMES_REALTOR_ID)) return;
  const npc = createNpc(HOMES_REALTOR_ID, def, ctx.groundPos(REALTOR_POS.x, REALTOR_POS.z));
  ctx.addEntity(npc);
}

/** The lot this character name owns, if any (one home per character). */
export function homeLotOf(ctx: SimContext, name: string): string {
  for (const [lotId, own] of Object.entries(ctx.homes.lots)) {
    if (own.owner.toLowerCase() === name.toLowerCase()) return lotId;
  }
  return '';
}

export function homeBuy(ctx: SimContext, lotId: string, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const { meta, e } = r;
  const lot = HOME_LOTS.find((l) => l.id === lotId);
  if (!lot) return;
  // Must be doing business at the lane: with the Realtor or on the doorstep.
  const realtor = ctx.entities.get(HOMES_REALTOR_ID);
  const atRealtor = !!realtor && dist2d(e.pos, realtor.pos) <= HOMES_BUY_RANGE;
  const atDoor = Math.hypot(e.pos.x - lot.door.x, e.pos.z - lot.door.z) <= HOMES_BUY_RANGE;
  if (!atRealtor && !atDoor) {
    ctx.error(meta.entityId, 'See Realtor Maribel on Homestead Lane to buy a home.');
    return;
  }
  // THE PAID GATE. The entitlement is set on the account when the $CR deed
  // payment clears (exchange/custody side); free accounts stop here, always.
  if (meta.homeownerEntitled !== true) {
    ctx.error(
      meta.entityId,
      `A deed on Homestead Lane costs ${HOME_PRICE_CR} $CR — settle the deed payment first.`,
    );
    return;
  }
  if (ctx.homes.lots[lotId]) {
    ctx.error(meta.entityId, 'That home already has an owner.');
    return;
  }
  const existing = homeLotOf(ctx, meta.name);
  if (existing) {
    ctx.error(meta.entityId, 'You already hold a deed on Homestead Lane.');
    return;
  }
  ctx.homes.lots[lotId] = {
    owner: meta.name,
    characterId: meta.characterId ?? null,
    at: ctx.time,
  };
  ctx.emit({
    type: 'log',
    text: `The deed to ${lot.name} is yours. Welcome home.`,
    color: '#1eff00',
    pid: e.id,
  });
}

export function homesInfoFor(ctx: SimContext, pid?: number): HomesInfo | null {
  const r = ctx.resolve(pid);
  if (!r) return null;
  const myLotId = homeLotOf(ctx, r.meta.name);
  if (!myLotId && !isAtHomes(r.e.pos.x, r.e.pos.z)) return null;
  return {
    lots: HOME_LOTS.map((l) => {
      const own = ctx.homes.lots[l.id];
      return {
        id: l.id,
        name: l.name,
        owner: own?.owner ?? '',
        mine: l.id === myLotId,
      };
    }),
    entitled: r.meta.homeownerEntitled === true,
    myLotId,
    priceCr: HOME_PRICE_CR,
  };
}
