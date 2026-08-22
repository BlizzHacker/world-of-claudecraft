#!/usr/bin/env node
// Stage 8c: turn the measured body geometry into the WIELD term - the one number
// per body that makes a weapon's size a function of who is holding it.
//
//   node scripts/realm_assets/emit_wield.mjs \
//     --geometry scripts/realm_assets/bodies_geometry.generated.json \
//     --out src/render/characters/realm_wield.generated.ts
//
// Idempotent: same geometry file => byte-identical output.
//
// ---------------------------------------------------------------------------
// THE RULE
// ---------------------------------------------------------------------------
// emit_arms.mjs sizes each weapon as a FRACTION of a reference wielder:
//
//     gripTargetLength = fraction(class) * WIELD_REF_HEIGHT
//
// The engine attaches that model to a hand BONE and then prepareVisual()
// normalises the whole body - weapon included - by def.height / rawHeight. So
// what the player sees is
//
//     onScreenWeaponLength / onScreenBodyHeight = gripTargetLength / rawHeight
//                                               = fraction * WIELD_REF_HEIGHT / rawHeight
//
// which is only the fraction the weapon table asked for when rawHeight happens
// to equal the reference. It does not: across this library rawHeight runs 1.32
// to 4.03 (a 3.06x spread) because the source meshes were authored at whatever
// scale their artist used and manual_rig binds them as authored. A single sword
// therefore reads as a dagger on a giant and a greatsword on a gnome.
//
// The fix is one multiplier applied at the attach, per WIELDER:
//
//     wield = rawHeight / WIELD_REF_HEIGHT
//
// which cancels the normalisation exactly and leaves the on-screen ratio at
// fraction(class) for every body in the bank. It is deliberately blind to which
// weapon is held: the class term already lives in emit_arms.mjs, and a term that
// knew about both would have to be regenerated whenever either changed.
//
// This is also why the value is NOT baked into the weapon grips: 380 weapons x
// 1,200 wielders is a product, wield is a sum. It is applied at attach time so a
// runtime gear swap or a weapon skin inherits it for free.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPermanentlyRejectedRealmBodyKey } from './catalog_policy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv;
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

const GEOMETRY = arg('geometry', resolve(__dirname, 'bodies_geometry.generated.json'));
const OUT = arg('out', resolve(__dirname, '../../src/render/characters/realm_wield.generated.ts'));
const PRUNE_ONLY = argv.includes('--prune-only');

function pruneExistingWieldTable() {
  if (!existsSync(OUT)) {
    console.error(`[wield] missing ${OUT}; cannot prune generated table`);
    process.exit(2);
  }
  const input = readFileSync(OUT, 'utf8').split('\n');
  let pruned = 0;
  const output = input.filter((line) => {
    const key = /^\s*"([^"]+)":\s/.exec(line)?.[1];
    if (!key || !isPermanentlyRejectedRealmBodyKey(key)) return true;
    pruned++;
    return false;
  });
  writeFileSync(OUT, output.join('\n'));
  console.log(`[wield] pruned ${pruned} rejected body rows -> ${OUT}`);
}

if (PRUNE_ONLY) {
  pruneExistingWieldTable();
  process.exit(0);
}

// The wielder emit_arms.mjs sizes against: the shared KayKit reference knight,
// 2.54 world units crown-to-heel. Every weapon length in that file is a fraction
// of THIS number, so changing it here rescales the whole library at once and
// must be done in both files together.
const WIELD_REF_HEIGHT = 2.54;

// Guard rails on the multiplier itself. These are NOT art direction - the class
// fractions in emit_arms.mjs are - they exist so one bad measurement (a body
// whose idle clip flings a cape 12 units into the air, a rig that failed to
// bind) cannot ship a weapon the size of a building. On the current library the
// real range is 0.52 to 1.59, so neither bound binds; they are a fuse.
const WIELD_MIN = 0.4;
const WIELD_MAX = 2.2;

// The wield term assumes the hand bone carries no scale of its own - every body
// in this library shares one 24-joint skeleton bound unscaled, so a weapon
// inherits exactly the body's normalisation and nothing else. If that ever stops
// being true the multiplier is wrong by the bone's scale and the fix belongs in
// the rig, not here, so this fails loudly rather than shipping a silent skew.
const BONE_SCALE_TOLERANCE = 0.01;

function round(v, n = 4) {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

function main() {
  if (!existsSync(GEOMETRY)) {
    console.error(`[wield] missing ${GEOMETRY}; run measure_bodies.mjs first`);
    process.exit(2);
  }
  const geometry = JSON.parse(readFileSync(GEOMETRY, 'utf8'));

  const scales = {};
  const clamped = [];
  const skewed = [];
  for (const [rel, geo] of Object.entries(geometry)) {
    const key = rel
      .split('/')
      .pop()
      .replace(/\.glb$/, '');
    if (isPermanentlyRejectedRealmBodyKey(key)) continue;
    if (!(geo.height > 1e-3)) continue;
    if (geo.handR !== null && Math.abs(geo.handR - 1) > BONE_SCALE_TOLERANCE) {
      skewed.push(`${key} handslot.r scale ${geo.handR}`);
      continue;
    }
    const raw = geo.height / WIELD_REF_HEIGHT;
    const wield = Math.min(WIELD_MAX, Math.max(WIELD_MIN, raw));
    if (raw < WIELD_MIN || raw > WIELD_MAX)
      clamped.push(`${key} ${round(raw, 3)} -> ${round(wield, 3)}`);
    scales[key] = round(wield);
  }

  if (skewed.length) {
    console.error(
      `[wield] ${skewed.length} bodies carry a SCALED hand bone; the wield term cannot be ` +
        'exact for them and they are omitted (weapon keeps its reference size):',
    );
    for (const s of skewed.slice(0, 10)) console.error(`  ${s}`);
  }

  const keys = Object.keys(scales).sort();
  const lines = [];
  lines.push('// GENERATED FILE - DO NOT EDIT BY HAND.');
  lines.push('// Produced by scripts/realm_assets/emit_wield.mjs from');
  lines.push('// scripts/realm_assets/bodies_geometry.generated.json. Re-run to regenerate.');
  lines.push('//');
  lines.push('// One number per generated body: how large this wielder is relative to the');
  lines.push('// reference the weapon library is sized against. assets.ts multiplies it into');
  lines.push("// the hand grip, which cancels prepareVisual()'s body normalisation and leaves");
  lines.push('// a weapon reading at the same fraction of its wielder on every body.');
  lines.push('//');
  lines.push('// Without it the weapon is a fixed world length attached to bodies whose native');
  lines.push('// heights span 3x, so the SAME sword reads as a dagger on one and a greatsword');
  lines.push('// on the next. See emit_wield.mjs for the derivation.');
  lines.push('//');
  lines.push('// A body missing from this table wields at the reference size (1.0), which is');
  lines.push('// the exact pre-existing behaviour - so every hand-authored entry in');
  lines.push('// manifest.ts is untouched by this file.');
  lines.push('');
  lines.push('/** Height of the wielder every weapon length in realm_arms.generated.ts is a');
  lines.push(' *  fraction of (the shared KayKit reference knight, crown to heel). */');
  lines.push(`export const REALM_WIELD_REF_HEIGHT = ${WIELD_REF_HEIGHT};`);
  lines.push('');
  lines.push('/** Body model basename -> hand-grip size multiplier for whatever it holds. */');
  lines.push('export const REALM_WIELD_SCALE: Record<string, number> = {');
  for (const k of keys) lines.push(`  ${JSON.stringify(k)}: ${scales[k]},`);
  lines.push('};');
  lines.push('');

  writeFileSync(OUT, lines.join('\n'));

  const v = keys.map((k) => scales[k]).sort((a, b) => a - b);
  console.log(`[wield] ${keys.length} bodies -> ${OUT}`);
  console.log(
    `[wield] multiplier: min ${v[0]}  median ${v[Math.floor(v.length / 2)]}  max ${v[v.length - 1]}`,
  );
  console.log(`[wield] clamped to [${WIELD_MIN}, ${WIELD_MAX}]: ${clamped.length}`);
  for (const c of clamped.slice(0, 10)) console.log(`  ${c}`);
}

main();
