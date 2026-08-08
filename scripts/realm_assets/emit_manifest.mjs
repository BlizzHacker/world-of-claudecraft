#!/usr/bin/env node
// Stage 7: turn the staged rigged GLBs into a GENERATED companion module for
// src/render/characters/manifest.ts.
//
// manifest.ts is hand-authored (2,159 lines, 124 entries) and stays that way —
// hundreds of bodies cannot live there. This emits GENERATED_VISUALS alongside it,
// merged so HAND-AUTHORED KEYS ALWAYS WIN. Curated infernal/classic work can never
// be clobbered by a pipeline re-run.
//
// Every rigged body carries the exact KayKit clip vocabulary and real
// handslot.r/.l bones, so entries reuse the existing `kaykit()` ClipMap helper and
// bind weapon sockets directly.
//
//   node emit_manifest.mjs --staging /staging --out src/render/characters/manifest.generated.ts

import { readdirSync, writeFileSync, readFileSync, existsSync, statSync,
         openSync, closeSync, unlinkSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const STAGING = arg('staging', '/mnt/usb4/moveweight-assets/cr-realms-staging');
const OUT = arg('out', '/opt/cryptic-realm/src/render/characters/manifest.generated.ts');
const ENTRIES = arg('entries', '/tmp/entries.json');
const REJECTS = arg('rejects', '/tmp/rejects.json');

// Words that mean the mesh ships holding a weapon -> NPC/enemy only, per directive:
// "IF they already are holding a weapon then they are an npc / enemy character asset only".
// Such bodies get NO attach[] and are never player-selectable.
const ARMED = /\b(warlord|warrior|knight|soldier|archer|gunner|swordsman|axeman|spearman|wielding|holding|armed|with (a |an )?(sword|axe|spear|staff|bow|gun|rifle|blade|hammer|shield|scythe|dagger))/i;

// Attack clip sets by flavour, so a mage does not chop and a gunner does not slice.
function attacksFor(name, realm) {
  // A trooper does not chop. Firearm realms always use the ranged shoot clip.
  if (GUN_REALMS.has(realm)) return ["'2H_Ranged_Shoot'"];
  const s = name.toLowerCase();
  if (/(mage|wizard|sorcer|warlock|witch|shaman|priest|cleric|caster|arcane|spell)/.test(s)) {
    return ["'Spellcast_Shoot'"];
  }
  if (/(archer|ranger|hunter|bow|crossbow|gun|rifle|sniper|shooter|marksman)/.test(s)) {
    return ["'2H_Ranged_Shoot'"];
  }
  if (/(berserk|barbarian|ogre|giant|troll|brute|warlord|executioner|greatsword|2h|two.hand)/.test(s)) {
    return ["'2H_Melee_Attack_Chop'"];
  }
  if (/(rogue|assassin|thief|ninja|dual)/.test(s)) {
    return ["'Dualwield_Melee_Attack_Chop'"];
  }
  return ["'1H_Melee_Attack_Chop'", "'1H_Melee_Attack_Slice_Diagonal'"];
}


// Realms that fight with firearms. One weapon set, shared: build guns once and every
// gun-carrying realm inherits them rather than each realm needing its own pass.
const GUN_REALMS = new Set(['fps', 'dominion', 'arcadevoid']);

// The REAL weapon libraries, emitted by emit_arms.mjs from the asset store:
// 255 guns under /cr-realms/fps/weapons and 77 confidently-gripped melee weapons
// under /cr-realms/classic/melee, each with a measured grip baked into
// src/render/characters/realm_arms.generated.ts.
//
// Before this, every armed body in a gun realm carried one of FOUR hardcoded
// models, and `${realm}/wpn_*.glb` only actually exists under fps and dominion —
// so every generated arcadevoid body was reaching for a 404 and rendering
// empty-handed. Realms without their own bucket now borrow the owning realm's
// files (the store is one shared tree served at /cr-realms, so a cross-realm URL
// resolves on every realm host).
const ARMS_INDEX = arg('arms', join(dirname(fileURLToPath(import.meta.url)), 'arms_index.generated.json'));
const ARMS = existsSync(ARMS_INDEX) ? JSON.parse(readFileSync(ARMS_INDEX, 'utf8')) : null;

// Fallback for a checkout without the arms index: the historical four models.
const LEGACY_GUNS = ['wpn_rifle', 'wpn_revolver', 'wpn_blaster_heavy', 'wpn_blaster_sci'];

function poolFor(kind, realm) {
  const byRealm = ARMS?.[kind];
  if (!byRealm) return null;
  // A realm's own bucket wins; otherwise fall back to whichever realm owns the
  // library for this weapon kind (fps for guns, classic for melee).
  const own = byRealm[realm];
  if (own?.length) return own;
  const shared = kind === 'guns' ? byRealm.fps : byRealm.classic;
  return shared?.length ? shared : null;
}

/** Deterministic pick so a body always spawns holding the same weapon. Salted
 *  per kind so a body's gun and its melee weapon are not the same index. */
function armFor(pool, key, salt) {
  let h = 2166136261;
  const s = `${salt}:${key}`;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return pool[h % pool.length];
}

/** Mainhand URL for a generated body, or null to keep the hand-authored default. */
function armUrlFor(realm, key) {
  const gun = GUN_REALMS.has(realm);
  const pool = poolFor(gun ? 'guns' : 'melee', realm);
  if (pool) return armFor(pool, key, gun ? 'gun' : 'melee');
  if (!gun) return null;
  return `/cr-realms/${realm}/${armFor(LEGACY_GUNS, key, 'gun')}.glb`;
}

const entries = existsSync(ENTRIES) ? JSON.parse(readFileSync(ENTRIES, 'utf8')) : [];
const byKey = new Map(entries.map((e) => [e.key, e]));
const rejects = new Set(existsSync(REJECTS) ? JSON.parse(readFileSync(REJECTS, 'utf8')) : []);

const realms = readdirSync(STAGING).filter((d) => {
  try { return statSync(join(STAGING, d)).isDirectory(); } catch { return false; }
});

const out = [];
const stats = {};
const familyKeys = {};

// A body is authored ONCE, under the realm it was staged into, and its GLB lives
// only there. Secondary realms reference the same key (and therefore the same
// file) rather than duplicating 2.7GB of geometry — assets are meant to be re-used
// across realms, e.g. every humanoid is FPS-eligible.
for (const realm of realms.sort()) {
  const files = readdirSync(join(STAGING, realm)).filter((f) => f.endsWith('.glb')).sort();
  const kept = [];
  for (const f of files) {
    const key = f.replace(/\.glb$/, '');
    if (rejects.has(key)) continue;
    const meta = byKey.get(key);
    // Emit ONLY bodies this pipeline produced. Reading the store (which is what
    // makes the url check race-free) also exposes the hand-curated GLBs that
    // manifest.ts already registers — e.g. the single-take Meshy bodies whose only
    // clip is `Armature|Unreal Take|baselayer`. Handing those the KayKit clip
    // vocabulary would name clips they do not contain, so nothing would animate.
    if (!meta || !key.startsWith('realm_')) continue;
    const name = meta.name ?? key;
    const armed = ARMED.test(name);
    kept.push({ key, realm, name, armed, attacks: attacksFor(name, realm), realms: meta?.realms ?? [realm] });
  }
  stats[realm] = kept.length;
  out.push(...kept);
}

// Pools: list each body under EVERY realm its classification matched, not just the
// realm it was staged into.
const staged = new Set(out.map((e) => e.key));
for (const e of out) {
  for (const r of e.realms.length ? e.realms : [e.realm]) {
    (familyKeys[r] ??= []).push(e);
  }
}
// Realms whose theme the lexicon barely matches would otherwise ship EMPTY, which
// is worse than a broad roster: crypticrealm is a namesake best-of rather than a
// theme at all, exchange is a hub every realm's characters visit, and arcadevoid's
// vocabulary (neon/arcade/retro) matches almost nothing in this library. Each gets
// an even spread across the full set rather than the first N, so the sample shows
// the range instead of whatever sorts first.
const all = out.filter((e) => staged.has(e.key));
function evenSpread(n) {
  if (!all.length) return [];
  const step = Math.max(1, Math.floor(all.length / n));
  return all.filter((_, i) => i % step === 0).slice(0, n);
}
if (all.length) {
  familyKeys.crypticrealm = evenSpread(180);
  // Offset these two so the three fallback realms do not show an identical cast.
  const rot = (arr, by) => arr.slice(by).concat(arr.slice(0, by));
  familyKeys.arcadevoid = rot(evenSpread(120), 40);
  familyKeys.exchange = rot(evenSpread(90), 15);
}
const poolStats = Object.fromEntries(
  Object.entries(familyKeys).map(([r, v]) => [r, v.length]),
);

const lines = [];
lines.push('// GENERATED FILE - DO NOT EDIT BY HAND.');
lines.push('// Produced by scripts/realm_assets/emit_manifest.mjs from the rigged asset');
lines.push('// staging area. Re-run the pipeline to regenerate; hand edits will be lost.');
lines.push('//');
lines.push('// Every body here was rigged onto the KayKit reference skeleton by');
lines.push('// scripts/asset_pipeline/lib/manual_rig.mjs, so each one carries the full 22-clip');
lines.push('// KayKit vocabulary natively plus real handslot.r / handslot.l bones.');
lines.push('//');
lines.push('// `role` is enforced here: a body whose source mesh already ships holding a');
lines.push('// weapon is an NPC/enemy asset only - it gets no attach[] and is never');
lines.push('// player-selectable. Clean-handed bodies get live weapon sockets.');
lines.push('');
lines.push("import type { ClipMap, VisualDef } from './manifest';");
lines.push('');
lines.push('const REALM_MODELS = \'/cr-realms\';');
lines.push("const WEAPONS = 'models/weapons';");
lines.push('const GEN_H = 2.6; // matches HUMANOID_H; manual_rig fits every body to the reference');
lines.push('');
lines.push('/** Local copy of the KayKit ClipMap shape (manifest.ts keeps its own private one). */');
lines.push('const genClips = (attack: string[]): ClipMap => ({');
lines.push("  idle: 'Idle',");
lines.push("  walk: 'Walking_A',");
lines.push("  run: 'Running_A',");
lines.push("  walkBack: 'Walking_Backwards',");
lines.push('  attack,');
lines.push("  hit: ['Hit_A'],");
lines.push("  death: 'Death_A',");
lines.push("  cast: 'Spellcasting',");
lines.push("  sitDown: 'Sit_Floor_Down',");
lines.push("  sitIdle: 'Sit_Floor_Idle',");
lines.push("  swim: 'Lie_Idle',");
lines.push("  jump: 'Jump_Idle',");
lines.push("  stow: '1H_Melee_Attack_Chop',");
lines.push('});');
lines.push('');
lines.push('export const GENERATED_VISUALS: Record<string, VisualDef> = {');
for (const e of out) {
  lines.push(`  ${e.key}: {`);
  lines.push(`    url: \`\${REALM_MODELS}/${e.realm}/${e.key}.glb\`,`);
  lines.push('    height: GEN_H,');
  // Realm bodies never join the eager boot preload sweep: it is site-wide and
  // blocking, and 970 bodies is ~750MB of parallel fetches before world entry.
  // renderer.ts requires the whole realm bank to be absent from it; these load
  // on demand through preloadVisualAssets() when an entity first needs one.
  lines.push('    lazyPreload: true,');
  lines.push(`    clips: genClips([${e.attacks.join(', ')}]),`);
  // Per-entity colour. Without a tint field applyMaterials returns null and every
  // instance of a body renders identically, so a pool of 600 still reads as clones.
  // Strength is deliberately low: these carry full Meshy PBR textures and a strong
  // lerp washes the art out. This is also the hook armour dye will use.
  lines.push("    tint: 'entity',");
  lines.push('    tintStrength: 0.18,');
  if (!e.armed) {
    const armUrl = armUrlFor(e.realm, e.key);
    if (GUN_REALMS.has(e.realm)) {
      // Firearm: right hand only. A shield in the off-hand reads as nonsense on a
      // shooter, and the ranged clip already occupies both arms.
      lines.push('    attach: [');
      lines.push(`      { url: '${armUrl}', bone: 'handslot.r' },`);
      lines.push('    ],');
      lines.push('    weaponSlots: [0],');
    } else {
      // Fantasy realms keep the authored KayKit shield in the off-hand; only the
      // mainhand upgrades to a library weapon, and only when emit_arms.mjs was
      // confident which end of it is the handle.
      lines.push('    attach: [');
      if (armUrl) {
        lines.push(`      { url: '${armUrl}', bone: 'handslot.r' },`);
      } else {
        lines.push("      { url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' },");
      }
      lines.push("      { url: `${WEAPONS}/shield_round.glb`, bone: 'handslot.l' },");
      lines.push('    ],');
      lines.push('    weaponSlots: [0],');
      lines.push('    offhandSlot: 1,');
    }
  } else {
    lines.push('    // ships holding a weapon -> NPC/enemy only, no live equipment sockets');
  }
  lines.push('  },');
}
lines.push('};');
lines.push('');
lines.push('/** Bodies available per realm, for REALM_MOB_FAMILY_KEYS / roster wiring. */');
lines.push('export const GENERATED_REALM_BODIES: Record<string, readonly string[]> = {');
for (const [realm, kept] of Object.entries(familyKeys)) {
  lines.push(`  ${realm}: [`);
  for (const e of kept) lines.push(`    '${e.key}',`);
  lines.push('  ],');
}
lines.push('};');
lines.push('');
lines.push('/** Keys that ship holding a weapon: NPC/enemy use only, never player-selectable. */');
lines.push('export const GENERATED_NPC_ONLY: ReadonlySet<string> = new Set([');
for (const e of out.filter((x) => x.armed)) lines.push(`  '${e.key}',`);
lines.push(']);');
lines.push('');

// Several asset passes regenerate this file, and they have raced: a run that
// emitted a CLEAN manifest was overwritten seconds later with stale content, so
// quarantined assets stayed in the registry pointing at files that no longer
// serve. Take an exclusive lock for the write, and rename into place so a reader
// never sees a half-written module.
const LOCK = `${OUT}.lock`;
let lockFd = null;
for (let i = 0; i < 60; i++) {
  try {
    lockFd = openSync(LOCK, 'wx');
    break;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    // A crashed run must not wedge every later one.
    try {
      if (Date.now() - statSync(LOCK).mtimeMs > 10 * 60_000) unlinkSync(LOCK);
    } catch {}
    execSync('sleep 2');
  }
}
if (lockFd === null) {
  console.error(`[emit] could not take ${LOCK} after 2 minutes — another emit is running; refusing to clobber it`);
  process.exit(3);
}
try {
  writeFileSync(`${OUT}.tmp`, lines.join('\n'));
  renameSync(`${OUT}.tmp`, OUT);
} finally {
  closeSync(lockFd);
  try { unlinkSync(LOCK); } catch {}
}
const armed = out.filter((e) => e.armed).length;
console.log(`[emit] ${out.length} visuals -> ${OUT}`);
console.log('[emit] authored per realm (owns the GLB):', stats);
console.log('[emit] POOL per realm (incl. re-used bodies):', poolStats);
console.log(`[emit] npc-only (armed): ${armed}   player-eligible: ${out.length - armed}`);
