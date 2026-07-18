// Eastbrook Homes: Homestead Lane, the premium housing terrace southwest of
// town, as plain numbers. Same single-source rule as the other venue layouts
// (vale_cup/derby/boarpit): this module drives the terrain flatten
// (src/sim/world.ts), the static colliders (src/sim/colliders.ts), the
// purchase/ownership logic (src/sim/social/homes.ts), and the render
// dressing (src/render/eastbrook_homes.ts).
//
// Eastbrook Homes is a PREMIUM feature, not a minigame: deeds are priced in
// $CR and only paying accounts (the homeowner entitlement) can buy. The lane
// itself is public ground — anyone can walk it and window-shop.
//
// Site survey: the terrace at (-36,-36) is the quiet quarter between town and
// the Copper Dig road: the webwood spiders (-60,5 r22) stay 13yd+ north of
// the pad's apron, the tunnel rats (-82,-62 r20) 20yd+ southwest, the hub
// plateau ring (r26) ends 12yd northeast, and Reliquary Hill (-5,-52) hosts a
// delve door, not a camp. Sim layer: no three.js imports.
import type { Collider } from './colliders';

// ---------------------------------------------------------------------------
// Site footprint
// ---------------------------------------------------------------------------
export const HOMES_CENTER = { x: -36, z: -36 };

export const HOMES_FLAT = {
  xMin: -48,
  xMax: -24,
  zMin: -46,
  zMax: -26,
  height: 1.0,
  falloff: 8, // yards of smoothstep ring outside the rectangle
};

// Decoration exclusion (world.ts + render foliage/critters/motes).
export const HOMES_EXCLUDE = { xMin: -58, xMax: -14, zMin: -56, zMax: -16 };

// ---------------------------------------------------------------------------
// The four lots on Homestead Lane, west to east along the north side; the
// lane itself (walkway) runs along z = -28. Each lot is a fenced-off house
// footprint with its door facing the lane (north side, +z).
// ---------------------------------------------------------------------------
export interface HomeLotDef {
  id: string;
  name: string;
  /** House footprint (also the always-present foundation collider). */
  rect: { xMin: number; xMax: number; zMin: number; zMax: number };
  /** Door-step spot on the lane, where the deed is inspected. */
  door: { x: number; z: number };
}

export const HOME_LOTS: readonly HomeLotDef[] = Array.from({ length: 4 }, (_, i) => {
  const xMin = -46 + i * 5.5;
  return {
    id: `lot_${String.fromCharCode(97 + i)}`, // lot_a .. lot_d
    name: `No. ${i + 1} Homestead Lane`,
    rect: { xMin, xMax: xMin + 4.6, zMin: -40, zMax: -34 },
    door: { x: xMin + 2.3, z: -32.5 },
  };
});

// Realtor Maribel's stand at the east end of the lane, toward town.
export const REALTOR_POS = { x: -26.5, z: -30, facing: -Math.PI / 2 };

// Deed price shown on the sale boards, in $CR. The purchase itself settles
// through the account's homeowner entitlement (set when the $CR payment
// clears on the exchange/custody side); the sim never touches the chain.
export const HOME_PRICE_CR = 250;

/** Inside the lane shell (presence predicate; also gates homesInfo). */
export function isAtHomes(x: number, z: number): boolean {
  return (
    x >= HOMES_FLAT.xMin - 10 &&
    x <= HOMES_FLAT.xMax + 10 &&
    z >= HOMES_FLAT.zMin - 10 &&
    z <= HOMES_FLAT.zMax + 10
  );
}

/** Inside the full footprint incl. the apron (decoration exclusion). */
export function isInHomesShell(x: number, z: number): boolean {
  return (
    x >= HOMES_EXCLUDE.xMin &&
    x <= HOMES_EXCLUDE.xMax &&
    z >= HOMES_EXCLUDE.zMin &&
    z <= HOMES_EXCLUDE.zMax
  );
}

// ---------------------------------------------------------------------------
// Collision set: each lot's foundation platform is ALWAYS solid (ownership is
// dynamic but the static collider grid is built once, so the pad stands
// whether the cottage above it is built or the plot is still for sale), plus
// the sale-board post at each door and the Realtor's stand.
// ---------------------------------------------------------------------------
export function homesColliders(): Collider[] {
  const out: Collider[] = [];
  const top = HOMES_FLAT.height + 3.6;
  for (const lot of HOME_LOTS) {
    out.push({
      type: 'obb',
      x: (lot.rect.xMin + lot.rect.xMax) / 2,
      z: (lot.rect.zMin + lot.rect.zMax) / 2,
      hw: (lot.rect.xMax - lot.rect.xMin) / 2,
      hd: (lot.rect.zMax - lot.rect.zMin) / 2,
      rot: 0,
      cameraTopY: top,
      camGhost: true,
    });
    out.push({
      type: 'circle',
      x: lot.door.x - 1.6,
      z: lot.door.z,
      r: 0.3,
      cameraTopY: HOMES_FLAT.height + 1.6,
      camGhost: true,
    });
  }
  out.push({
    type: 'circle',
    x: REALTOR_POS.x + 1.4,
    z: REALTOR_POS.z,
    r: 0.8,
    cameraTopY: HOMES_FLAT.height + 1.4,
    camGhost: true,
  });
  return out;
}
