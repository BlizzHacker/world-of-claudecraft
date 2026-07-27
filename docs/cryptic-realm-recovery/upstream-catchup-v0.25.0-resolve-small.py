#!/usr/bin/env python3
"""Resolve the small, unambiguous v0.25.0 conflicts.

Each entry is an exact conflict block and its merged replacement. Every one of
these is an independent-addition collision, so the resolution keeps BOTH sides;
import order follows module-path sort to satisfy biome. The one semantic case is
visual.ts, where upstream's VFX-mesh guard must WRAP our visibility tracking
rather than drop it.
"""
import io
import sys

REPO = "/opt/cr-v030/"

R = [
    (
        "server/characters.ts",
        """<<<<<<< HEAD
import { characterSheet, type SheetRank } from './character_sheet';
import { isDuranceTesterCharacter } from './durance_tester_entitlement';
=======
import { characterSheet, SHEET_RECENT_DEEDS, type SheetRank } from './character_sheet';
>>>>>>> v0.25.0
""",
        """import { characterSheet, SHEET_RECENT_DEEDS, type SheetRank } from './character_sheet';
import { isDuranceTesterCharacter } from './durance_tester_entitlement';
""",
    ),
    (
        "server/http/registry.ts",
        """<<<<<<< HEAD
import { routes as realmVisualRoutes } from '../realm_visuals';
=======
import { routes as steamRoutes } from '../steam';
>>>>>>> v0.25.0
""",
        """import { routes as realmVisualRoutes } from '../realm_visuals';
import { routes as steamRoutes } from '../steam';
""",
    ),
    (
        "src/render/characters/index.ts",
        """<<<<<<< HEAD
export type { AnimState, CharacterVisualOptions } from './visual';
export { CharacterVisual } from './visual';
=======
export type { AnimState } from './visual';
export { CharacterVisual, setWeaponVfxViewportHeight } from './visual';
>>>>>>> v0.25.0
""",
        """export type { AnimState, CharacterVisualOptions } from './visual';
export { CharacterVisual, setWeaponVfxViewportHeight } from './visual';
""",
    ),
    (
        "src/render/characters/visual.ts",
        """<<<<<<< HEAD
      if (mesh.isMesh) {
        this.originalMaterials.set(mesh, mesh.material);
        if (!this.originalVisibility.has(mesh)) this.originalVisibility.set(mesh, mesh.visible);
      }
=======
      // VFX rig meshes stay out of the ghost/restore cycle: their shader
      // materials are owned by the weapon-skin handle, never overlaid.
      if (mesh.isMesh && !mesh.userData.weaponVfxMesh)
        this.originalMaterials.set(mesh, mesh.material);
>>>>>>> v0.25.0
""",
        """      // VFX rig meshes stay out of the ghost/restore cycle: their shader
      // materials are owned by the weapon-skin handle, never overlaid.
      if (mesh.isMesh && !mesh.userData.weaponVfxMesh) {
        this.originalMaterials.set(mesh, mesh.material);
        if (!this.originalVisibility.has(mesh)) this.originalVisibility.set(mesh, mesh.visible);
      }
""",
    ),
    (
        "src/sim/data.ts",
        """<<<<<<< HEAD
import { MOUNT_ITEMS } from './content/mounts';
=======
import { FURY_NPC, WARFARE_ITEMS } from './content/pvp_honor';
>>>>>>> v0.25.0
""",
        """import { MOUNT_ITEMS } from './content/mounts';
import { FURY_NPC, WARFARE_ITEMS } from './content/pvp_honor';
""",
    ),
    (
        "src/sim/entity.ts",
        """<<<<<<< HEAD
import { d2MobDmgMult, d2MobHpMult, d2PlayerDmgMult, d2PlayerHpMult } from './realms/registry';
=======
import { pvpFractionsFromRatings } from './pvp';
>>>>>>> v0.25.0
""",
        """import { pvpFractionsFromRatings } from './pvp';
import { d2MobDmgMult, d2MobHpMult, d2PlayerDmgMult, d2PlayerHpMult } from './realms/registry';
""",
    ),
]

ok, fail = [], []
for rel, old, new in R:
    path = REPO + rel
    with io.open(path, encoding="utf-8") as fh:
        src = fh.read()
    if old not in src:
        fail.append(rel)
        continue
    src = src.replace(old, new, 1)
    with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(src)
    left = src.count("<<<<<<<")
    ok.append("%s (remaining hunks: %d)" % (rel, left))

print("RESOLVED:")
for s in ok:
    print("  " + s)
if fail:
    print("FAILED TO MATCH:")
    for s in fail:
        print("  " + s)
    sys.exit(1)
