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

import { readdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
function attacksFor(name) {
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

const entries = existsSync(ENTRIES) ? JSON.parse(readFileSync(ENTRIES, 'utf8')) : [];
const byKey = new Map(entries.map((e) => [e.key, e]));
const rejects = new Set(existsSync(REJECTS) ? JSON.parse(readFileSync(REJECTS, 'utf8')) : []);

const realms = readdirSync(STAGING).filter((d) => {
  try { return statSync(join(STAGING, d)).isDirectory(); } catch { return false; }
});

const out = [];
const stats = {};
const familyKeys = {};

for (const realm of realms.sort()) {
  const files = readdirSync(join(STAGING, realm)).filter((f) => f.endsWith('.glb')).sort();
  const kept = [];
  for (const f of files) {
    const key = f.replace(/\.glb$/, '');
    if (rejects.has(key)) continue;
    const meta = byKey.get(key);
    const name = meta?.name ?? key;
    const armed = ARMED.test(name);
    kept.push({ key, realm, name, armed, attacks: attacksFor(name) });
  }
  stats[realm] = kept.length;
  if (kept.length) familyKeys[realm] = kept;
  out.push(...kept);
}

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
  lines.push(`    clips: genClips([${e.attacks.join(', ')}]),`);
  if (!e.armed) {
    lines.push('    attach: [');
    lines.push("      { url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' },");
    lines.push("      { url: `${WEAPONS}/shield_round.glb`, bone: 'handslot.l' },");
    lines.push('    ],');
    lines.push('    weaponSlots: [0],');
    lines.push('    offhandSlot: 1,');
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

writeFileSync(OUT, lines.join('\n'));
const armed = out.filter((e) => e.armed).length;
console.log(`[emit] ${out.length} visuals -> ${OUT}`);
console.log('[emit] per realm:', stats);
console.log(`[emit] npc-only (armed): ${armed}   player-eligible: ${out.length - armed}`);
