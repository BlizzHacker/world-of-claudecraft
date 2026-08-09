#!/usr/bin/env node
// Build a RENDER shortlist for the civilian rotation.
//
// Two attempts to score rig quality numerically both failed - the first passed
// bodies that have no hands, the second scored zero for bodies that plainly do,
// because inverted bind matrices are not in the mesh's space and the scale
// differs per file. So this uses only signals that cannot be misread:
//
//   both hand JOINTS exist        (a rig without them can never hold anything)
//   clip count >= 4               (needs a movement vocabulary)
//   bbox span/height < 0.95       (pure vertex maths - a T-pose scarecrow)
//   humanoid proportions          (taller than wide, not a quadruped or a prop)
//
// That is a coarse net on purpose. It narrows ~1,600 bodies to something a
// person can look at, and looking is what decides - the barred bodies passed
// every number anyone measured, right up until someone rendered them and saw
// forearms ending in flat blades.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const REALMS = ['infernal','classic','dominion','arcane','fps','arcadevoid','crypticrealm','claudecraft','exchange'];
const STORE = '/opt/cr-realms-store';
const WANT = Number(process.env.WANT ?? 200);

// Already judged: in the rotation, or barred with a stated defect. Excluded so
// the shortlist is genuinely new material rather than a re-run of the audit.
const JUDGED = [
  'iron_warden', 'weathered_elder', 'hooded_wanderer', 'monk',
  'forge_worker', 'hermit', 'white_sage', 'road_mercenary', 'vanguard',
  'iron_ranger', 'veil_adept', 'crusader', 'spiritborn', 'barbarian',
  'necromancer', 'tempest', 'assassin', 'tainted_hood',
];

const rows = [];
for (const realm of REALMS) {
  const dir = join(STORE, realm);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.glb'))) {
    if (JUDGED.some((j) => f.includes(j))) continue;
    let doc;
    try { doc = await io.read(join(dir, f)); } catch { continue; }
    const root = doc.getRoot();
    const skin = root.listSkins()[0];
    if (!skin) continue;
    const names = new Set(skin.listJoints().map((j) => j.getName()));
    if (!names.has('LeftHand') || !names.has('RightHand')) continue;
    const clips = root.listAnimations().length;
    // NOT filtered on baked clips: animation is bound at runtime from the shared
    // clip bank, so a body with zero clips of its own still moves in game.
    // Filtering on them here excluded almost the whole pool for no reason.

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity, verts = 0;
    for (const mesh of root.listMeshes())
      for (const prim of mesh.listPrimitives()) {
        const P = prim.getAttribute('POSITION')?.getArray();
        if (!P) continue;
        verts += P.length / 3;
        for (let i = 0; i < P.length; i += 3) {
          minX = Math.min(minX, P[i]); maxX = Math.max(maxX, P[i]);
          minY = Math.min(minY, P[i+1]); maxY = Math.max(maxY, P[i+1]);
          minZ = Math.min(minZ, P[i+2]); maxZ = Math.max(maxZ, P[i+2]);
        }
      }
    const h = maxY - minY, w = maxX - minX, d = maxZ - minZ;
    if (!(h > 0)) continue;
    const span = w / h;
    if (span >= 0.95) continue;
    if (h < Math.max(w, d) * 1.15) continue;   // upright, not a quadruped or prop
    rows.push({ realm, name: basename(f), clips, span: +span.toFixed(3), verts, joints: names.size });
  }
}

rows.sort((a, b) => b.clips - a.clips || a.span - b.span);
console.log(`shortlist candidates: ${rows.length}`);
const pick = rows.slice(0, WANT);
for (const r of pick) console.log(`  ${r.realm}/${r.name}  clips ${r.clips} span ${r.span} joints ${r.joints}`);
writeFileSync('/tmp/civ_shortlist.json', JSON.stringify(pick, null, 1));
console.log(`\nwrote ${pick.length} to /tmp/civ_shortlist.json`);
