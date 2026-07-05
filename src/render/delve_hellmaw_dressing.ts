// Infernal dressing for The Hellmaw (Durance) delve (render-only). Layered ON TOP
// of the shared ossuary/finale crypt dressing to give the descent its own hellish
// identity: heaped bone piles and ribcage trophies along the flanks, skull-cairns,
// and blood-red ember glow pooling on the floor. Deterministic (hash2, no sim
// state); every prop kind is in the loadable BITS pack (bone_A/B, skull,
// skull_candle, ribcage) so nothing no-ops on a missing GLB. Kept clear of the
// central aisle (|x|<10 door mouths) and the boss fighting ring.

import type { DelveModuleId } from '../sim/delve_layout';
import type { DungeonLayout } from '../sim/dungeon_layout';
import { hash2 } from '../sim/rng';

const HELLMAW_SEED = 0x48656c6c; // 'Hell' in ASCII

/** Minimal sink matching dungeon Placements.add (kit prop names). */
export interface HellmawPlacementSink {
  add(kind: string, x: number, y: number, z: number, rotY?: number, scale?: number): void;
}

/** True for any Hellmaw (Durance) module id. */
export function isHellmawModuleId(id: string): boolean {
  return id.startsWith('hellmaw_');
}

/**
 * Heap the infernal bone-litter along both flank walls of a Hellmaw room, plus a
 * few ribcage/skull trophies. Positions are derived from the room depth so bigger
 * rooms get more litter; all sit near |x|=wallX-4 (against the walls), clear of
 * the walkable aisle and the offset door mouths. `addGlow` paints a blood-red
 * ember pool under a subset for the hellish underlight.
 */
export function placeHellmawInfernalDressing(
  p: HellmawPlacementSink,
  moduleId: DelveModuleId,
  layout: DungeonLayout,
  addGlow: (x: number, z: number, color: number, y?: number, scale?: number) => void,
): void {
  if (!isHellmawModuleId(moduleId)) return;
  const wallX = layout.wallX ?? 24;
  const flankX = wallX - 4; // hug the walls, clear of the aisle
  const zLo = layout.zMin + 10;
  const zHi = layout.zMax - 10;
  const depth = Math.max(0, zHi - zLo);
  // ~one litter cluster every 14u of depth, per wall.
  const rows = Math.max(3, Math.round(depth / 14));
  for (let i = 0; i < rows; i++) {
    const t = rows > 1 ? i / (rows - 1) : 0;
    const z = zLo + t * depth;
    for (const side of [-1, 1] as const) {
      const h = hash2(moduleId.length + i * 3.7 + side, z, HELLMAW_SEED);
      const x = side * flankX;
      const rot = h * Math.PI * 2;
      // Alternate the litter kind by a stable hash so it doesn't read as a grid.
      const roll = Math.floor(h * 4);
      if (roll === 0) {
        p.add('bone_A', x, 0.05, z, rot, 1.5);
        p.add('bone_B', x - side * 0.8, 0.04, z + 0.6, rot * 1.7, 1.4);
      } else if (roll === 1) {
        p.add('ribcage', x, 0.35, z, rot, 1.6);
      } else if (roll === 2) {
        p.add('skull', x, 0.0, z, rot, 1.3);
        p.add('bone_A', x - side * 0.9, 0.05, z - 0.7, rot * 2.1, 1.3);
      } else {
        // skull-cairn with a blood-ember glow pooling beneath it
        p.add('skull_candle', x, 0.0, z, rot, 1.4);
        addGlow(x, z, 0x8a1408, 0.06, 1.4);
      }
    }
  }
  // A cluster of blood-ember floor glows drifting up the centre-flanks (not on the
  // aisle) so the whole hall reads underlit in hellish red, not neutral crypt-grey.
  const glowRows = Math.max(2, Math.round(depth / 22));
  for (let i = 0; i < glowRows; i++) {
    const z = zLo + ((i + 0.5) / glowRows) * depth;
    const gx = (hash2(i * 5.1, z, HELLMAW_SEED) - 0.5) * (flankX - 6) * 2;
    addGlow(gx, z, 0x6a0e04, 0.05, 1.8);
  }
}
