#!/usr/bin/env node
// Emit src/render/characters/creatures.generated.ts from the shipped quadruped
// manifest (tmp/quad_shipped.json, written by tmp/quad_ship.mjs).
//
// These bodies are rigged onto the SHIPPED wolf donor skeleton
// (public/models/creatures/wolf_basic.glb, the "Dog_Animation" quadruped rig)
// by scripts/realm_assets/quad_rig.mjs, so each one carries that rig's 14 baked
// clips natively. There is no runtime retarget anywhere in this engine — every
// creature is a GLB with its clips already baked in — so the ClipMap below is
// simply the donor's own vocabulary, identical to manifest.ts's WOLF_BAKED.
//
//   node scripts/realm_assets/emit_creatures.mjs [--out <path>]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/opt/cryptic-realm';
function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const OUT = arg('out', join(REPO, 'src/render/characters/creatures.generated.ts'));
const SRC = arg('src', join(REPO, 'tmp/quad_shipped.json'));

// World height in units at entity scale 1. The renderer normalises every body
// with `normScale = def.height / rawHeight` (assets.ts), and EVERY quadruped
// here was fitted to the same donor bind box, so without this table an elephant
// and a fox would render at identical size. Tiers are keyed off the census
// name/note — the only size signal the sources carry, since a generated mesh's
// own units are arbitrary. Wolf-sized (1.6) is the default because that is what
// mob_wolf, the beast-family fallback these bodies sit alongside, uses.
// FIRST PASS: a human should tune individual entries against the world.
const SIZE_TIERS = [
  [2.8, /elephant|behemoth|leviathan|mammoth/i],
  [2.4, /rhino|rino|steed|charger|horse|warboar|ironbound|iron beast/i],
  [2.1, /bear|gorilla|ape|cerberus|drake|dragon|golem|mechanism/i],
  [1.8, /boar|ram|stag|direwolf|stalker|devourer|saurian|lizard/i],
  [1.0, /\bfox\b|chomper|critter|hare/i],
];
const heightFor = (text) => SIZE_TIERS.find(([, re]) => re.test(text))?.[0] ?? 1.6;

const shipped = JSON.parse(readFileSync(SRC, 'utf8'));
shipped.sort((a, b) => (a.key < b.key ? -1 : 1));

const byRealm = {};
for (const s of shipped) (byRealm[s.realm] ??= []).push(s.key);

const esc = (s) => String(s).replace(/\*\//g, '*\\/').replace(/[\r\n]+/g, ' ').slice(0, 110);

const body = shipped
  .map((s) => {
    const h = heightFor(`${s.name} ${s.note}`);
    return `  // ${esc(s.note || s.name)}
  ${s.key}: {
    url: \`\${REALM_MODELS}/${s.realm}/creatures/${s.url.split('/').pop()}\`,
    height: ${h},
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },`;
  })
  .join('\n');

const realms = Object.entries(byRealm)
  .map(([r, keys]) => `  ${r}: [\n${keys.map((k) => `    '${k}',`).join('\n')}\n  ],`)
  .join('\n');

writeFileSync(
  OUT,
  `// GENERATED FILE - DO NOT EDIT BY HAND.
// Produced by scripts/realm_assets/emit_creatures.mjs from the shipped
// quadruped manifest. Re-run the pipeline to regenerate; hand edits will be lost.
//
// The first non-humanoid rig family in this engine. Every body here was bound
// onto the SHIPPED wolf donor skeleton (public/models/creatures/wolf_basic.glb,
// the "Dog_Animation" quadruped rig) by scripts/realm_assets/quad_rig.mjs, so
// each one carries that rig's 14 clips baked in. Nothing retargets at runtime —
// SkeletonUtils is only ever used here as \`clone\` — which is exactly why the
// clips have to travel inside the GLB.
//
// These are creature bodies: no handslot bones, no weapon sockets, no tint.
// Unlike the humanoid pool (manifest.generated.ts) which tints per entity to
// stop a shared body reading as clones, every mesh here ships its own baked
// texture and is visually distinct already; tinting would only mute it, which is
// why greyjaw — the other custom-baked wolf — carries no tint either.

import type { ClipMap, VisualDef } from './manifest';

const REALM_MODELS = '/cr-realms';

/** The donor rig's own clip vocabulary. Mirrors manifest.ts's private
 *  WOLF_BAKED: the Quaternius animal() core plus the donor's Sit/Fall, with
 *  Walk doubling as the swim base (a paddling gait at the gentle clip pitch
 *  beats the steep procedural prone on a quadruped). */
const QUADRUPED_BAKED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Gallop',
  attack: ['Attack'],
  hit: ['Idle_HitReact_Left', 'Idle_HitReact_Right'],
  death: 'Death',
  sitIdle: 'Sit',
  swim: 'Walk',
  jump: 'Fall',
};

export const GENERATED_CREATURE_VISUALS: Record<string, VisualDef> = {
${body}
};

/** Per-realm rosters, ready to wire into beast-family spawn selection. Nothing
 *  reads this yet: registering the visuals is deliberately separate from
 *  changing which mob picks which body, so art can land without moving spawns. */
export const GENERATED_CREATURE_BODIES: Record<string, string[]> = {
${realms}
};
`,
);

console.log(`${shipped.length} creatures -> ${OUT}`);
for (const [r, keys] of Object.entries(byRealm)) console.log(`  ${r}: ${keys.length}`);
