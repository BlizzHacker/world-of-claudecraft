#!/usr/bin/env node
// Emit src/render/characters/machines.generated.ts from the shipped machine
// manifest (scripts/realm_assets/machines_shipped.json).
//
// The THIRD non-humanoid family, and the first that is not an animal at all:
// turrets, catapults, rovers, a starfighter. Produced by
// scripts/realm_assets/machine_rig.mjs, which — unlike quad_rig and
// nonhumanoid_rig — has no donor. A creature's motion is observed, so it is
// borrowed from a donor skeleton; a machine's is DERIVED, so machine_rig
// generates the skeleton from the mesh and synthesises the clips from the
// mechanism (yaw about the post, pitch about the trunnion, recoil along the
// barrel, spin about the axle).
//
// WHY A THIRD FILE AND NOT A THIRD BUCKET IN creatures.generated.ts: the same
// reason the arachnids got their own. Each family's ClipMap must be pinned to
// the vocabulary its own rig really baked, and a clip name that is not in the
// GLB does not throw — the body just stands still forever.
//
// WHY THESE ARE VISUALS AND NOT DECOR: they carry Idle/Attack/Hit/Death, i.e.
// they are meant to be fought, not stood next to. The decor system
// (src/sim/realm_decor.generated.ts) has no concept of a prop with clips — its
// rows are geometry only. Rather than add animation to decor, these register as
// ordinary VisualDefs, which already models everything they need. The ONE new
// thing is the store bucket: emit_decor.mjs scans
// ['props','buildings','vehicles','ships','mechs','turrets'], so these live
// under `<realm>/machines/`, which it does not scan, and the two systems can
// never claim the same GLB.
//
//   node scripts/realm_assets/emit_machines.mjs [--out <path>] [--src <path>]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/opt/cryptic-realm';
function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const OUT = arg('out', join(REPO, 'src/render/characters/machines.generated.ts'));
const SRC = arg('src', join(REPO, 'scripts/realm_assets/machines_shipped.json'));
const STORE = arg('store', '/opt/cr-realms-store');

const shipped = JSON.parse(readFileSync(SRC, 'utf8'));
shipped.sort((a, b) => (a.key < b.key ? -1 : 1));

const VOCAB = ['Idle', 'Walk', 'Run', 'Attack', 'Hit', 'Death'];
const bad = shipped.filter((s) => VOCAB.some((c) => !s.clips.includes(c)));
if (bad.length) {
  console.error('rows missing a clip the ClipMap names:');
  for (const b of bad) console.error(`  ${b.key}: has ${b.clips.join(',')}`);
  process.exit(1);
}
const missing = shipped.filter((s) => !existsSync(join(STORE, s.realm, 'machines', s.file)));
if (missing.length) {
  console.error(`missing GLBs in ${STORE}:`);
  for (const m of missing) console.error(`  ${m.realm}/machines/${m.file}`);
  process.exit(1);
}

const byRealm = {};
for (const s of shipped) (byRealm[s.realm] ??= []).push(s.key);

const esc = (s) =>
  String(s).replace(/\*\//g, '*\\/').replace(/[\r\n]+/g, ' ').slice(0, 110);

const body = shipped
  .map(
    (s) => `  // ${esc(s.note)} (${s.joints} joints)
  ${s.key}: {
    url: \`\${REALM_MODELS}/${s.realm}/machines/${s.file}\`,
    height: ${s.height},
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },`,
  )
  .join('\n');

const realms = Object.entries(byRealm)
  .map(([r, keys]) => `  ${r}: [\n${keys.map((k) => `    '${k}',`).join('\n')}\n  ],`)
  .join('\n');

writeFileSync(
  OUT,
  `// GENERATED FILE - DO NOT EDIT BY HAND.
// Produced by scripts/realm_assets/emit_machines.mjs from the shipped machine
// manifest. Re-run the pipeline to regenerate; hand edits will be lost.
//
// The engine's THIRD non-humanoid family: turrets, catapults, rovers and a
// starfighter, rigged by scripts/realm_assets/machine_rig.mjs. That rigger has
// no donor — a machine's motion is derived from its mechanism rather than
// observed, so the skeleton is generated from the mesh and every clip is
// synthesised (yaw about the post, pitch about the trunnion, recoil along the
// barrel, spin about the axle). Nothing retargets at runtime; the clips travel
// inside the GLB, as with every other family here.
//
// SEPARATE FROM creatures.generated.ts AND arachnids.generated.ts for the reason
// each of those is separate from the other: a ClipMap must name only clips its
// own rig really baked, and a wrong name does not throw — the body stands in its
// rest pose for ever. These share ONE vocabulary of six, verified present in all
// ${shipped.length} GLBs by the emitter before this file is written.
//
// These are not decor. src/sim/realm_decor.generated.ts models geometry-only
// props and has no concept of a prop with clips; these carry Idle/Attack/Hit/
// Death because they are meant to be fought. They therefore ship under
// \`<realm>/machines/\`, which emit_decor.mjs does NOT scan, so no GLB here can
// also be registered as a motionless prop.
//
// No handslot bones and no tint: a turret has nothing to hold, and every mesh
// ships its own baked texture.

import type { ClipMap, VisualDef } from './manifest';

const REALM_MODELS = '/cr-realms';

/** The synthesised vocabulary machine_rig.mjs emits, and all of it.
 *
 *  \`walk\`/\`run\` are the mechanism's own motion (a turret tracking, a rover's
 *  wheels turning) rather than a gait, which is why an emplacement that never
 *  leaves its post still has them. There is no jump, no sit and no cast: nothing
 *  in the mechanism produces one, so naming one would be naming a clip that is
 *  not in the file. */
const MACHINE_BAKED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['Hit'],
  death: 'Death',
};

export const GENERATED_MACHINE_VISUALS: Record<string, VisualDef> = {
${body}
};

/** Per-realm rosters, keyed by the realm the body physically ships under.
 *
 *  NOTHING READS THIS YET, exactly as with GENERATED_CREATURE_BODIES and
 *  GENERATED_ARACHNID_BODIES: registering a visual is deliberately separate from
 *  changing which mob picks which body, so art can land without moving a spawn. */
export const GENERATED_MACHINE_BODIES: Record<string, string[]> = {
${realms}
};
`,
);

console.log(`${shipped.length} machines -> ${OUT}`);
for (const [r, keys] of Object.entries(byRealm)) console.log(`  ${r}: ${keys.length}`);
