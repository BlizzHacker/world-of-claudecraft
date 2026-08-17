#!/usr/bin/env node
// Emit src/render/characters/arachnids.generated.ts from the shipped arachnid
// manifest (scripts/realm_assets/arachnids_shipped.json).
//
// The SECOND non-humanoid rig family in this engine, and deliberately a separate
// file from creatures.generated.ts rather than more rows inside it. The two
// families do not share a clip vocabulary: the quadrupeds carry the wolf donor's
// 14 clips (Gallop, Sit, Idle_HitReact_Left/Right), these carry the arachnid
// donor's 9 (no Gallop, no Sit, a single Hit). tests/generated_creatures.test.ts
// asserts `run === 'Gallop'` on EVERY row it sees, so a spider merged into that
// record either fails that contract or, if the contract is loosened to let it
// pass, names a clip the GLB does not contain — and a missing clip does not
// throw, it stands in the rest pose forever. Separate records keep each family
// pinned to the vocabulary its own donor actually baked.
//
// Bound onto the arachnid donor by scripts/realm_assets/nonhumanoid_rig.mjs, so
// each GLB carries its 9 clips natively; nothing retargets at runtime.
//
//   node scripts/realm_assets/emit_arachnids.mjs [--out <path>] [--src <path>]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/opt/cryptic-realm';
function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const OUT = arg('out', join(REPO, 'src/render/characters/arachnids.generated.ts'));
const SRC = arg('src', join(REPO, 'scripts/realm_assets/arachnids_shipped.json'));
const STORE = arg('store', '/opt/cr-realms-store');

const shipped = JSON.parse(readFileSync(SRC, 'utf8'));
shipped.sort((a, b) => (a.key < b.key ? -1 : 1));

// Fail loudly rather than emit a row whose GLB is not in the store: a missing
// creature GLB renders nothing rather than erroring, so this is the only place
// the mistake is still cheap.
const missing = shipped.filter((s) => !existsSync(join(STORE, s.realm, 'creatures', s.file)));
if (missing.length) {
  console.error(`missing GLBs in ${STORE}:`);
  for (const m of missing) console.error(`  ${m.realm}/creatures/${m.file}`);
  process.exit(1);
}

const byRealm = {};
for (const s of shipped) (byRealm[s.realm] ??= []).push(s.key);

const esc = (s) =>
  String(s)
    .replace(/\*\//g, '*\\/')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 110);

const body = shipped
  .map(
    (s) => `  // ${esc(s.note)}
  ${s.key}: {
    url: \`\${REALM_MODELS}/${s.realm}/creatures/${s.file}\`,
    height: ${s.height},
    clips: ARACHNID_BAKED,
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
// Produced by scripts/realm_assets/emit_arachnids.mjs from the shipped arachnid
// manifest. Re-run the pipeline to regenerate; hand edits will be lost.
//
// The engine's SECOND non-humanoid rig family. Every body here was bound onto
// the arachnid donor skeleton by scripts/realm_assets/nonhumanoid_rig.mjs, so
// each one carries that donor's 9 clips baked in. Nothing retargets at runtime —
// SkeletonUtils is only ever used as \`clone\` — which is why the clips have to
// travel inside the GLB.
//
// SEPARATE FROM creatures.generated.ts ON PURPOSE. That file is the wolf-donor
// quadruped roster and its contract test asserts \`run === 'Gallop'\` on every row
// it holds. This donor never baked a Gallop, a Sit, or the wolf's split
// left/right hit reacts. Merging the two records would either break that
// assertion or force it loose enough to stop catching a typo — and a clip name
// the GLB does not contain never throws, it just stands in the rest pose for
// ever. One record per donor vocabulary is the only shape that stays honest.
//
// These are creature bodies: no handslot bones, no weapon sockets, no tint. The
// donor rig has no hands to hold anything with, so weaponSlots would accept
// setWeapon() and silently attach nothing.

import type { ClipMap, VisualDef } from './manifest';

const REALM_MODELS = '/cr-realms';

/** The arachnid donor's own baked vocabulary — all 9 clips it ships, no more.
 *
 *  \`run\` aliases Walk because the donor baked no run cycle; the renderer plays
 *  it faster rather than reaching for a clip that is not there. \`attack\` rotates
 *  the two distinct swings (a claw/limb strike and a Bite) so a pack does not
 *  hit in unison. 'Death 2' and 'Eating' are baked in the GLBs and deliberately
 *  unmapped: ClipMap has no second-death or feeding-idle slot, and inventing an
 *  alias for them would only mean a clip plays where the engine expects another.
 */
const ARACHNID_BAKED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Walk',
  attack: ['Attack', 'Bite'],
  hit: ['Hit'],
  death: 'Death',
  jump: 'Jump',
};

export const GENERATED_ARACHNID_VISUALS: Record<string, VisualDef> = {
${body}
};

/** Per-realm rosters, keyed by the realm the body physically ships under.
 *
 *  NOTHING READS THIS YET, exactly as with GENERATED_CREATURE_BODIES: registering
 *  a visual is deliberately separate from changing which mob picks which body, so
 *  art can land without moving a single spawn. Wiring these in is a call-site
 *  change in manifest.ts (visualKeyFor) plus a family added to the creature
 *  family set — note that set currently excludes 'spider' on purpose, because the
 *  wolf-donor quadrupeds it gates cannot walk on eight legs. These bodies can. */
export const GENERATED_ARACHNID_BODIES: Record<string, string[]> = {
${realms}
};
`,
);

console.log(`${shipped.length} arachnids -> ${OUT}`);
for (const [r, keys] of Object.entries(byRealm)) console.log(`  ${r}: ${keys.length}`);
