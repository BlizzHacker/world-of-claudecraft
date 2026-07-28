#!/usr/bin/env node
// Sub-project D: give every realm its own player-class bodies.
//
// Player visuals resolve through BODY_OVERRIDES[realm]['class:<PlayerClass>'],
// which is fed by the revisioned realm_visuals store — the ONE runtime body
// override system. So this drives upsertDraftRealmVisual + publishDraftRealmVisuals
// server-side rather than inventing a second source of truth or hand-editing
// manifest.ts.
//
// Two hard rules:
//  * class bodies MUST be player-eligible (they carry handslot sockets). An armed
//    NPC body would attach an equipped weapon THROUGH the one baked into the mesh.
//  * assignment is deterministic, so re-running produces the same roster.
//
//   node assign_classes.mjs --actor 1 [--apply] [--realms a,b]

import { readFileSync } from 'node:fs';

// manifest.generated.ts is TypeScript and node cannot import it, so parse it as
// text. Three things are needed: each visual's url, which bodies are player-eligible
// (weaponSlots present), and each realm's pool.
const GEN_SRC = readFileSync(
  '/opt/cryptic-realm/src/render/characters/manifest.generated.ts', 'utf8');

const GENERATED_VISUALS = {};
for (const m of GEN_SRC.matchAll(/^ {2}([A-Za-z0-9_]+): \{$([\s\S]*?)^ {2}\},$/gm)) {
  const [, key, body] = m;
  const u = body.match(/url: `\$\{REALM_MODELS\}\/([a-z0-9]+)\/([A-Za-z0-9_]+)\.glb`/);
  if (!u) continue;
  GENERATED_VISUALS[key] = {
    url: `/cr-realms/${u[1]}/${u[2]}.glb`,
    ...(/weaponSlots:/.test(body) ? { weaponSlots: [0] } : {}),
  };
}

const npcStart = GEN_SRC.indexOf('GENERATED_NPC_ONLY');
const npcBlock = npcStart >= 0 ? GEN_SRC.slice(npcStart, GEN_SRC.indexOf(']', npcStart)) : '';
const GENERATED_NPC_ONLY = new Set([...npcBlock.matchAll(/'([^']+)'/g)].map((x) => x[1]));

const GENERATED_REALM_BODIES = {};
const poolStart = GEN_SRC.indexOf('GENERATED_REALM_BODIES');
if (poolStart >= 0) {
  const b = GEN_SRC.slice(poolStart);
  for (const m of b.matchAll(/^ {2}([a-z0-9]+): \[([^\]]*)\]/gms)) {
    GENERATED_REALM_BODIES[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
}

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const APPLY = !!arg('apply');
const ACTOR = Number(arg('actor', 1));
const ONLY = arg('realms') ? String(arg('realms')).split(',') : null;

const CLASSES = ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'mage', 'warlock', 'druid'];

// Archetype keywords, most specific first. A class takes the best-matching body it
// can find in its realm's pool; ties break on the sorted key so runs are stable.
// \b anchors are load-bearing: an unanchored /sage/ matches "demonic_viSAGE_masks"
// and handed the priest slot to a mask asset. Every token here is matched as a word.
const WANT = {
  warrior:  [/\b(barbarian|berserker?|brute|juggernaut|warrior|fighter|brawler)\b/i, /\b(warlord|champion)\b/i],
  paladin:  [/\b(paladin|crusader|templar|holy|divine|angel|guardian)\b/i, /\b(knight|armored|plate)\b/i],
  hunter:   [/\b(archer|ranger|hunter|marksman|bow|scout|tracker)\b/i, /\b(outlaw|gunslinger)\b/i],
  rogue:    [/\b(rogue|assassin|thief|ninja|stalker|bandit)\b/i, /\b(pirate|corsair|buccaneer)\b/i],
  priest:   [/\b(priest|cleric|monk|acolyte|healer|saint|oracle)\b/i, /\b(sage|elder)\b/i],
  mage:     [/\b(mage|wizard|sorcerer|archmage|magus|elementalist)\b/i, /\b(mystic|seer|arcane)\b/i],
  warlock:  [/\b(warlock|necromancer|cultist|hexer|occult)\b/i, /\b(witch|summoner|lich)\b/i],
  druid:    [/\b(druid|shaman|nature|beastlord|primal|totem)\b/i, /\b(tribal|feral|beast)\b/i],
};

function poolFor(realm) {
  return (GENERATED_REALM_BODIES[realm] ?? [])
    // Player-eligible only: must have live sockets, not a baked-in weapon.
    .filter((k) => !GENERATED_NPC_ONLY.has(k) && GENERATED_VISUALS[k]?.weaponSlots?.length)
    .slice()
    .sort();
}

function pick(pool, cls, taken, realm) {
  // Class identity is the realm's face, so prefer bodies AUTHORED for this realm
  // over ones merely re-used into its pool. Cross-realm re-use is right for
  // background mobs and wrong for "what does a Warlock look like here".
  const native = pool.filter((k) => k.startsWith(`realm_${realm}_`));
  for (const tier of [native, pool]) {
    for (const re of WANT[cls] ?? []) {
      const hit = tier.find((k) => re.test(k) && !taken.has(k));
      if (hit) return hit;
    }
  }
  // No thematic match: take a stable slot so every class still gets a distinct body.
  const idx = CLASSES.indexOf(cls);
  const base = native.length ? native : pool;
  for (let i = 0; i < base.length; i++) {
    const k = base[(idx * 7 + i) % base.length];
    if (!taken.has(k)) return k;
  }
  return null;
}

const realms = (ONLY ?? Object.keys(GENERATED_REALM_BODIES)).filter((r) => poolFor(r).length);
const plan = {};
for (const realm of realms) {
  const pool = poolFor(realm);
  const taken = new Set();
  plan[realm] = {};
  for (const cls of CLASSES) {
    const key = pick(pool, cls, taken, realm);
    if (!key) continue;
    taken.add(key);
    plan[realm][`class:${cls}`] = { key, assetUrl: GENERATED_VISUALS[key].url };
  }
}

for (const [realm, m] of Object.entries(plan)) {
  console.log(`\n${realm}  (pool ${poolFor(realm).length} player-eligible)`);
  for (const [t, v] of Object.entries(m)) console.log(`  ${t.padEnd(16)} ${v.key}`);
}

if (!APPLY) {
  console.log('\n[dry-run] pass --apply to upsert + publish');
  process.exit(0);
}

// dist-server/server.cjs is a bundled entry and re-exports nothing, so import the
// module directly. Requires tsx: `npx tsx scripts/realm_assets/assign_classes.mjs`.
const { upsertDraftRealmVisual, publishDraftRealmVisuals } =
  await import('/opt/cryptic-realm/server/realm_visuals.ts').catch((e) => {
    console.error('import failed (run under tsx):', String(e.message).slice(0, 120));
    return {};
  });
if (!upsertDraftRealmVisual) process.exit(1);
for (const [realm, m] of Object.entries(plan)) {
  for (const [target, v] of Object.entries(m)) {
    await upsertDraftRealmVisual({
      realm, key: target, assetUrl: v.assetUrl, assetName: v.key, actorAccountId: ACTOR,
    });
  }
  await publishDraftRealmVisuals({ realm, actorAccountId: ACTOR });
  console.log(`published ${realm}: ${Object.keys(m).length} class bodies`);
}
