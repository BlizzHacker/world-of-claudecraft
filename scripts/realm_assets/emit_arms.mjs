#!/usr/bin/env node
// Stage 8: turn the realm store's HELD-WEAPON buckets (<realm>/weapons,
// <realm>/melee) into grip data the engine can attach, plus an index the body
// generator picks from.
//
// Why this exists: emit_manifest.mjs used to hand every generated body in a gun
// realm one of FOUR hardcoded models (wpn_rifle / wpn_revolver /
// wpn_blaster_heavy / wpn_blaster_sci), two of which do not even exist under
// every realm's directory. The store holds 255 real guns and 127 melee weapons
// that nothing referenced. This wires the real library in.
//
//   node scripts/realm_assets/emit_arms.mjs \
//     --store /opt/cr-realms-store \
//     --geometry scripts/realm_assets/arms_geometry.generated.json \
//     --out src/render/characters/realm_arms.generated.ts \
//     --index scripts/realm_assets/arms_index.generated.json
//
// Idempotent: same store + same geometry file => byte-identical output.
//
// ---------------------------------------------------------------------------
// THE GRIP MODEL
// ---------------------------------------------------------------------------
// Every GLB in this library comes out of the same generator: ONE root node, a
// uniform node scale near 1.0, geometry centred on the origin, and a longest
// axis normalised to exactly 2.0 local units. So a grip is fully described by
// three numbers the engine already supports through WEAPON_GRIP_OVERRIDES:
//
//   scale  target length / native local length  (the engine's VariantGrip clamp
//          is a Y-extent clamp, which is meaningless for a weapon lying along X,
//          so the family maxHeight is inert and scale does all the work)
//   rot    maps the model's longest axis onto the hand's "pointing" direction,
//          picked so the chosen END of that axis is the one IN the fist
//   pos    slides the model along that axis so the fist lands on the grip
//          instead of the model's centre
//
// Which end goes in the fist is the one thing geometry cannot be assumed:
//   * guns   ship with a consistent muzzle direction (verified by rendering
//            bodies holding them), so they use a FIXED end.
//   * melee  does not - a mace can be authored head-up or head-down. The handle
//            is the end whose outer slab has the smaller cross-section radius
//            (measure_arms.mjs). Where that signal is weak (a straight sword is
//            nearly as thin at the pommel as at the tip) the weapon is SKIPPED
//            rather than shipped held by its blade; those bodies keep the
//            hand-authored KayKit sword.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const STORE = arg('store', '/opt/cr-realms-store');
const GEOMETRY = arg('geometry', resolve(__dirname, 'arms_geometry.generated.json'));
const OUT = arg('out', resolve(__dirname, '../../src/render/characters/realm_arms.generated.ts'));
const INDEX = arg('index', resolve(__dirname, 'arms_index.generated.json'));

// Rotation (XYZ euler degrees, composed AFTER the hand-side flip by
// variantGripTransform) that lays the model's longest axis along the hand's
// pointing direction. `plus`/`minus` names the end of that axis that ends up IN
// the fist; the other end is what the character points at the world.
// MELEE REST TILT
// ---------------------------------------------------------------------------
// ROT alone lays the weapon along the hand bone's local Y, and in the idle pose
// that axis points STRAIGHT OUT of a hanging fist - so a 2-unit staff, a scythe
// and even a claw glove all run horizontally THROUGH the wielder. Rendered
// front+side on a socketed body, every weapon class showed it, and every one of
// them reads correctly with a further -90 degrees about hand-local X: blades and
// hafts hang down the leg, shields sit vertically on the arm.
//
// The tilt applies in HAND space, after the axis map (v = base * T * E * v_model),
// so the emitted euler is T composed with E - NOT E with -90 added to its X
// field. For this particular table the two happen to coincide, because every ROT
// entry rotates about X or Z with Y = 0; the composition is done properly anyway
// so a future ROT entry with a non-zero Y cannot silently produce a wrong grip.
//
// Guns are excluded: their muzzle direction was verified by rendering and points
// where it should already.
const REST_TILT_X = -90;
function restTilt([rx, ry, rz]) {
  const q = quatMul(quatFromEulerDeg(REST_TILT_X, 0, 0), quatFromEulerDeg(rx, ry, rz));
  return eulerFromQuatDeg(q).map((v) => round(v));
}
const D2R = Math.PI / 180;
function quatFromEulerDeg(xd, yd, zd) {
  const x = xd * D2R, y = yd * D2R, z = zd * D2R;
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}
function quatMul([ax, ay, az, aw], [bx, by, bz, bw]) {
  return [
    ax * bw + aw * bx + ay * bz - az * by,
    ay * bw + aw * by + az * bx - ax * bz,
    az * bw + aw * bz + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
function eulerFromQuatDeg([x, y, z, w]) {
  const m13 = Math.max(-1, Math.min(1, 2 * (x * z + y * w)));
  const ey = Math.asin(m13);
  let ex, ez;
  if (Math.abs(m13) < 0.9999) {
    ex = Math.atan2(-2 * (y * z - x * w), 1 - 2 * (x * x + y * y));
    ez = Math.atan2(-2 * (x * y - z * w), 1 - 2 * (y * y + z * z));
  } else {
    ex = Math.atan2(2 * (y * z + x * w), 1 - 2 * (x * x + z * z));
    ez = 0;
  }
  return [ex / D2R, ey / D2R, ez / D2R];
}

const ROT = {
  'x:plus': [0, 0, -90],
  'y:plus': [180, 0, 0],
  'z:plus': [90, 0, 0],
  'x:minus': [0, 0, 90],
  'y:minus': [0, 0, 0],
  'z:minus': [-90, 0, 0],
};

// ---------------------------------------------------------------------------
// SIZE: a fraction of the WIELDER, not a world length
// ---------------------------------------------------------------------------
// These tables used to be absolute world lengths, which is the same thing ONLY
// for a wielder of reference height. The generated body bank is not: rigged from
// source meshes authored at whatever scale their artist used, its raw heights run
// 1.32 to 4.03 world units. Since prepareVisual() normalises each body by its own
// raw height and the weapon rides a hand bone through that same divisor, a fixed
// world length becomes an apparent size that swings 3x with the wielder - the
// same sword a dagger on a giant, a greatsword on a gnome.
//
// So the number authored here is what it always meant to be: the weapon's length
// as a FRACTION OF ITS WIELDER'S HEIGHT. The absolute grip length below is that
// fraction times the reference height, and scripts/realm_assets/emit_wield.mjs
// emits the per-body multiplier that carries it to every other wielder.
//
// The reference is the shared KayKit knight, 2.54 units crown-to-heel, whose
// stock sword_a is 1.77 long - 0.70 of its height. This library is deliberately
// chunky/heroic and the ladder below is pitched to match it. CHANGING
// WIELD_REF_HEIGHT HERE MEANS CHANGING IT IN emit_wield.mjs TOO: the two halves
// of one equation live in the two files.
const WIELD_REF_HEIGHT = 2.54;

// Fraction of wielder height, per weapon class. This ladder IS the art
// direction: a hold-out pistol reads as a third of a body, a polearm reads
// nearly as tall as one.
const GUN_FRACTIONS = [
  [/(pistol|revolver|sidearm|magnum|derringer|holdout|hand.?cannon)/i, 0.335],
  [
    /(sniper|railgun|rail.?cannon|cannon|launcher|minigun|gatling|rocket|bazooka|heavy|lmg|hmg)/i,
    0.61,
  ],
  [/(smg|pdw|carbine|uzi|machine.?pistol)/i, 0.413],
];
const GUN_DEFAULT_FRACTION = 0.512;

const MELEE_FRACTIONS = [
  [/(dagger|knife|shiv|dirk|kunai|tanto)/i, 0.354],
  [/(wand|rod|scepter|sceptre|baton)/i, 0.413],
  [/(scythe|staff|stave|spear|polearm|halberd|glaive|lance|pike|trident|naginata)/i, 0.787],
  [/(hammer|mace|maul|club|axe|hatchet|cleaver|flail)/i, 0.571],
  [/(sword|blade|katana|sabre|saber|rapier|scimitar|falchion|claymore|greatsword)/i, 0.63],
];
const MELEE_DEFAULT_FRACTION = 0.571;

// Hard ceiling and floor on the ladder, so a future class row cannot ship a
// weapon longer than its wielder or too small to read at gameplay distance.
const FRACTION_MIN = 0.2;
const FRACTION_MAX = 0.95;

// Quantised to centimetres so the ladder stays a set of round reference lengths
// (0.85, 1.05, 1.30, 1.55 ...) rather than a column of float dust, and so
// re-expressing the table as fractions produced a byte-identical file: the only
// row this refactor changed is the one whose GLB left the store.
const toLength = (fraction) =>
  Math.round(Math.min(FRACTION_MAX, Math.max(FRACTION_MIN, fraction)) * WIELD_REF_HEIGHT * 100) /
  100;

const GUN_SIZES = GUN_FRACTIONS.map(([re, f]) => [re, toLength(f)]);
const GUN_DEFAULT = toLength(GUN_DEFAULT_FRACTION);
const MELEE_SIZES = MELEE_FRACTIONS.map(([re, f]) => [re, toLength(f)]);
const MELEE_DEFAULT = toLength(MELEE_DEFAULT_FRACTION);

// Fraction of the weapon's length the model slides along its own axis so the
// fist sits on the grip rather than the centre. A gun is gripped just behind
// its middle; a hafted weapon is gripped near the very end.
const GUN_SLIDE = 0.15;
const MELEE_SLIDE = 0.34;

// How much thicker one end must be before the thin end is trusted as the handle.
// Below this the shape is symmetric enough (a straight sword) that the guess is
// a coin flip, and a coin flip means fantasy realms shipping swords held by the
// blade half the time.
const MELEE_END_CONFIDENCE = 1.35;

// Things the melee classifier swept into <realm>/melee that are not a weapon a
// hand swings: shields belong in the OFF-hand (which keeps its authored KayKit
// shield), and emblems/banners/terrain are scenery that got mis-bucketed. Left
// in, a body would walk around brandishing a signpost.
const MELEE_EXCLUDE =
  /(shield|buckler|emblem|symbol|banner|crest|logo|icon|terrain|ruins|figurine|statue|throne|altar)/i;

// Whole CHARACTERS also landed in the melee bucket (orcs, a cyclops, a frost
// giant, a hydralisk). Nothing in their name says "weapon", so the only thing
// separating them from a real one is SHAPE: a weapon is a long thin thing, a
// creature is roughly as wide as it is tall. Keep an entry when its name names a
// weapon (which covers a warhammer whose head makes its box nearly square) OR
// when it is at least this much longer than it is wide.
const MELEE_ELONGATION = 2.0;
const MELEE_LEXICON = new RegExp(
  MELEE_SIZES.map(([re]) => re.source).join('|') +
    '|(spike|fang|claw|talon|whip|chain|bat|staff|pole|shaft|hilt|edge|slayer|reaper|breaker|' +
    'bringer|forge|weapon|arm(s|ament)?)',
  'i',
);

// The family VariantGrip is deliberately inert: `lift` 0 so the computed slide
// is exact, `maxHeight` far above any model's 2.0-unit extent so the shrink-only
// clamp never fires and `scale` alone sets the size.
//
// `scale` here sizes the weapon for a REFERENCE-height wielder. The engine
// multiplies in REALM_WIELD_SCALE (src/render/characters/realm_wield.generated.ts,
// emitted by emit_wield.mjs) for the body actually holding it, which is what
// turns these reference lengths back into the fractions of wielder height the
// ladder above asks for.
const FAMILY_GUN = 'VAR_REALM_GUN';
const FAMILY_MELEE = 'VAR_REALM_MELEE';

const BUCKET_FAMILY = { weapons: FAMILY_GUN, melee: FAMILY_MELEE };

function round(v, n = 4) {
  const f = 10 ** n;
  return Math.round(v * f) / f;
}

function sizeFor(name, table, fallback) {
  for (const [re, v] of table) if (re.test(name)) return v;
  return fallback;
}

function gripFor(bucket, base, geo) {
  const localLongest = Math.max(...geo.worldSize) / (geo.nodeScale || 1);
  if (!(localLongest > 1e-3)) return null;
  const isGun = bucket === 'weapons';
  if (!isGun) {
    if (MELEE_EXCLUDE.test(base)) return null;
    const dims = [...geo.worldSize].sort((a, b) => b - a);
    const elongation = dims[1] > 1e-6 ? dims[0] / dims[1] : Infinity;
    if (elongation < MELEE_ELONGATION && !MELEE_LEXICON.test(base)) return null;
  }
  const target = isGun
    ? sizeFor(base, GUN_SIZES, GUN_DEFAULT)
    : sizeFor(base, MELEE_SIZES, MELEE_DEFAULT);

  let handEnd;
  if (isGun) {
    // Verified by rendering: every gun in this library is authored muzzle-first
    // along its longest axis, so the fist always takes the `plus` end.
    handEnd = 'plus';
  } else {
    const { min, max } = geo.radius;
    const lo = Math.max(1e-6, Math.min(min, max));
    const hi = Math.max(min, max);
    if (hi / lo < MELEE_END_CONFIDENCE) return null;
    // The handle is the thin end; the fist takes it.
    handEnd = geo.thinEnd === 'min' ? 'minus' : 'plus';
  }

  let rot = ROT[`${geo.axis}:${handEnd}`];
  if (!rot) return null;
  if (!isGun) rot = restTilt(rot);
  const slide = (isGun ? GUN_SLIDE : MELEE_SLIDE) * target;
  return {
    scale: round(target / localLongest),
    rot,
    // `pos` is hand-local; its Y component runs along the weapon after `rot`.
    pos: [0, round(slide), 0],
  };
}

function prettyName(base) {
  // Display names come from the SHIPPED SLUG, never the source prompt: some of
  // this library is IP-adjacent and was deliberately re-slugged, and the raw
  // name field can still carry the original wording.
  const words = base
    .replace(/_[0-9a-f]{6,}$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const capped = words.slice(0, 6).map((w) => w[0].toUpperCase() + w.slice(1));
  return capped.join(' ') || base;
}

function main() {
  if (!existsSync(GEOMETRY)) {
    console.error(`[arms] missing ${GEOMETRY}; run measure_arms.mjs first`);
    process.exit(2);
  }
  const geometry = JSON.parse(readFileSync(GEOMETRY, 'utf8'));

  const families = {};
  const grips = {};
  const pools = { weapons: {}, melee: {} };
  const names = {};
  const skipped = { unmeasured: 0, rejected: 0 };

  const realms = readdirSync(STORE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'review' && d.name !== 'shared')
    .map((d) => d.name)
    .sort();

  for (const realm of realms) {
    for (const bucket of Object.keys(BUCKET_FAMILY)) {
      const dir = join(STORE, realm, bucket);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).sort()) {
        if (!file.endsWith('.glb')) continue;
        const base = file.replace(/\.glb$/, '');
        const geo = geometry[`${realm}/${bucket}/${file}`];
        if (!geo) {
          skipped.unmeasured++;
          continue;
        }
        const grip = gripFor(bucket, base, geo);
        if (!grip) {
          skipped.rejected++;
          continue;
        }
        families[base] = BUCKET_FAMILY[bucket];
        grips[base] = grip;
        names[base] = prettyName(base);
        if (!pools[bucket][realm]) pools[bucket][realm] = [];
        pools[bucket][realm].push(`/cr-realms/${realm}/${bucket}/${file}`);
      }
    }
  }

  const lines = [];
  lines.push('// GENERATED FILE - DO NOT EDIT BY HAND.');
  lines.push('// Produced by scripts/realm_assets/emit_arms.mjs from the realm asset store');
  lines.push('// plus scripts/realm_assets/arms_geometry.generated.json. Re-run to regenerate.');
  lines.push('//');
  lines.push('// These are the HELD weapons of the realm libraries: every entry is a real');
  lines.push('// GLB under /cr-realms/<realm>/{weapons,melee}/ that ships with the game and,');
  lines.push('// before this file existed, was referenced by nothing at all.');
  lines.push('//');
  lines.push('// assets.ts merges REALM_ARM_FAMILIES into KAYKIT_WEAPON_ACCESSORY so these');
  lines.push('// models route through the variant-grip path, and weapon_grip.ts merges');
  lines.push('// REALM_ARM_GRIPS into WEAPON_GRIP_OVERRIDES so each one is scaled, turned and');
  lines.push('// slid onto the fist. Both merges put the generated rows FIRST, so any');
  lines.push('// hand-tuned row of the same name still wins.');
  lines.push('');
  lines.push('/** Per-weapon grip fine-tune, structurally a WeaponGripOverride. Declared');
  lines.push(' *  locally rather than imported so this generated module has no cycle back');
  lines.push(' *  into weapon_grip.ts. */');
  lines.push('export interface RealmArmGrip {');
  lines.push('  scale?: number;');
  lines.push('  rot?: [number, number, number];');
  lines.push('  pos?: [number, number, number];');
  lines.push('}');
  lines.push('');
  lines.push('/** Grip FAMILY per weapon model basename, merged into KAYKIT_WEAPON_ACCESSORY. */');
  lines.push('export const REALM_ARM_FAMILIES: Record<string, string> = {');
  for (const k of Object.keys(families).sort()) {
    lines.push(`  ${JSON.stringify(k)}: '${families[k]}',`);
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Per-weapon scale/rotation/slide, merged into WEAPON_GRIP_OVERRIDES. */');
  lines.push('export const REALM_ARM_GRIPS: Record<string, RealmArmGrip> = {');
  for (const k of Object.keys(grips).sort()) {
    const g = grips[k];
    lines.push(
      `  ${JSON.stringify(k)}: { scale: ${g.scale}, rot: [${g.rot.join(', ')}], ` +
        `pos: [${g.pos.join(', ')}] },`,
    );
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Display name per weapon model basename, derived from the SHIPPED SLUG.');
  lines.push(' *  Part of this library is IP-adjacent and was deliberately re-slugged, so the');
  lines.push(' *  slug - never the source prompt - is the only safe display source. */');
  lines.push('export const REALM_ARM_NAMES: Record<string, string> = {');
  for (const k of Object.keys(names).sort()) {
    lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(names[k])},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Gun URLs per owning realm (the realm whose directory holds the GLB). */');
  lines.push('export const REALM_GUN_POOL: Record<string, readonly string[]> = {');
  for (const realm of Object.keys(pools.weapons).sort()) {
    lines.push(`  ${realm}: [`);
    for (const u of pools.weapons[realm]) lines.push(`    '${u}',`);
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');
  lines.push('/** Melee URLs per owning realm, confident-grip subset only. */');
  lines.push('export const REALM_MELEE_POOL: Record<string, readonly string[]> = {');
  for (const realm of Object.keys(pools.melee).sort()) {
    lines.push(`  ${realm}: [`);
    for (const u of pools.melee[realm]) lines.push(`    '${u}',`);
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');

  writeFileSync(OUT, lines.join('\n'));

  const index = {
    note: 'GENERATED by scripts/realm_assets/emit_arms.mjs - consumed by emit_manifest.mjs',
    guns: Object.fromEntries(
      Object.keys(pools.weapons)
        .sort()
        .map((r) => [r, pools.weapons[r]]),
    ),
    melee: Object.fromEntries(
      Object.keys(pools.melee)
        .sort()
        .map((r) => [r, pools.melee[r]]),
    ),
  };
  writeFileSync(INDEX, `${JSON.stringify(index, null, 1)}\n`);

  const count = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));
  console.log(`[arms] ${Object.keys(grips).length} held weapons -> ${OUT}`);
  console.log('[arms] guns per realm:', count(pools.weapons));
  console.log('[arms] melee per realm:', count(pools.melee));
  console.log(
    `[arms] skipped: ${skipped.unmeasured} unmeasured, ${skipped.rejected} rejected ` +
      '(ambiguous grip end or not a hand weapon)',
  );
}

main();
