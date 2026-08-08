#!/usr/bin/env node
// Emit the AUTOMATIC-DECORATION catalogue from the realm asset store.
//
// The store holds 1,267 world-placeable GLBs (props/buildings/vehicles/ships/
// mechs/turrets) that only the world builder could ever reach. This script
// decides which of them are safe to place AUTOMATICALLY, measures what each one
// costs, and writes src/sim/realm_decor.generated.ts. The placement algorithm
// itself is hand-written code (src/sim/realm_decor.ts) — only the catalogue is
// generated, because it is hundreds of rows.
//
//   node scripts/realm_assets/emit_decor.mjs \
//     --store /opt/cr-realms-store \
//     --out src/sim/realm_decor.generated.ts
//
// What it measures, per GLB, straight out of the glTF JSON chunk (no full
// parse, no three): triangle count, file size, and the DEQUANTIZED bounding box.
// The store is EXT_meshopt_compression + KHR_mesh_quantization, so POSITION
// accessors are normalized int16 whose min/max read ±32767 — dividing by 32767
// and applying the node scale is what turns that back into model units.
//
// What it REFUSES to place automatically:
//   - anything outside the world-placeable buckets (melee/weapons are held
//     items; a rifle lying in a field at prop scale reads as a bug);
//   - the 62 rows flagged `ip` in the store's review data. They ship, and a
//     builder may still place one by hand, but auto-placing IP-adjacent art in
//     every world by default is a decision for a human, not a generator;
//   - scenery props that are not world dressing. Most of the 695 `scenery_prop`
//     rows are busts, masks, rings, coins, emblems and character studies — a
//     30-foot signet ring in a meadow is not decoration. Scenery is admitted by
//     an ALLOWLIST of decor nouns, never by a deny list.

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const STORE = arg('store', '/opt/cr-realms-store');
const OUT = arg('out', '/opt/cryptic-realm/src/sim/realm_decor.generated.ts');
const REPORT = arg('report', null);

// Buckets that can stand in a world. Mirrors REALM_PROP_BUCKETS in
// server/forged_assets.ts (the world-builder catalogue) on purpose: the auto
// placer must never be able to reach something a builder cannot.
const BUCKETS = ['props', 'buildings', 'vehicles', 'ships', 'mechs', 'turrets'];

// ── measurement ─────────────────────────────────────────────────────────────

function glbJson(file) {
  const buf = readFileSync(file);
  if (buf.length < 12 || buf.readUInt32LE(0) !== 0x46546c67) return null; // 'glTF'
  let off = 12;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) {
      return JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8'));
    }
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return null;
}

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  return o;
}

function nodeMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0];
  const r = n.rotation || [0, 0, 0, 1];
  const s = n.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  const yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function apply(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

// Normalized-integer accessors carry min/max in RAW units; glTF says a
// normalized signed value is max(raw / (2^(n-1) - 1), -1).
const NORMALIZE_DIVISOR = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

function accessorBounds(accessor) {
  if (!accessor || !accessor.min || !accessor.max) return null;
  const div = accessor.normalized ? (NORMALIZE_DIVISOR[accessor.componentType] ?? 1) : 1;
  return {
    min: accessor.min.slice(0, 3).map((v) => v / div),
    max: accessor.max.slice(0, 3).map((v) => v / div),
  };
}

/** Triangles, primitive count and the world-space bounding box of one GLB. */
export function measureGlb(file) {
  const j = glbJson(file);
  if (!j) return null;
  const accessors = j.accessors || [];
  const meshes = j.meshes || [];
  const meshTris = meshes.map((m) =>
    (m.primitives || []).reduce((sum, p) => {
      if ((p.mode ?? 4) !== 4) return sum;
      const count =
        p.indices !== undefined
          ? accessors[p.indices]?.count
          : accessors[p.attributes?.POSITION]?.count;
      return sum + Math.floor((count || 0) / 3);
    }, 0),
  );
  const meshBounds = meshes.map((m) => {
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (const p of m.primitives || []) {
      const b = accessorBounds(accessors[p.attributes?.POSITION]);
      if (!b) continue;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], b.min[i]);
        max[i] = Math.max(max[i], b.max[i]);
      }
    }
    return Number.isFinite(min[0]) ? { min, max } : null;
  });

  let tris = 0;
  let prims = 0;
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  const nodes = j.nodes || [];
  const roots = j.scenes?.[j.scene ?? 0]?.nodes ?? nodes.map((_, i) => i);
  const walk = (index, parent) => {
    const node = nodes[index];
    if (!node) return;
    const m = mul(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      tris += meshTris[node.mesh] || 0;
      prims += (meshes[node.mesh]?.primitives || []).length;
      const b = meshBounds[node.mesh];
      if (b) {
        for (let corner = 0; corner < 8; corner++) {
          const p = apply(m, [
            corner & 1 ? b.max[0] : b.min[0],
            corner & 2 ? b.max[1] : b.min[1],
            corner & 4 ? b.max[2] : b.min[2],
          ]);
          for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], p[i]);
            max[i] = Math.max(max[i], p[i]);
          }
        }
      }
    }
    for (const child of node.children || []) walk(child, m);
  };
  for (const root of roots) walk(root, IDENTITY);
  if (!Number.isFinite(min[0])) return null;
  return {
    tris,
    prims,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

// ── classification ──────────────────────────────────────────────────────────

// The store's own review data files the whole library under six semantic
// buckets. Four of them are the object outright; the two open ones need a
// vocabulary check.
// A HUMAN-EQUIVALENT verdict beats a word match. tmp/nonhum_decisions.csv holds
// one visually-inspected class per asset (statue / scenery / structure / ...),
// produced by looking at 43 contact sheets. Where a file has such a verdict we
// use it instead of guessing from its slug - this is the same lesson that put a
// glowing cartoon heart in a Classic meadow because its name contained "rock".
const VISION_ROLE = {
  statue: 'monument',
  bust_fragment: 'monument',
  structure: 'structure',
  scenery: 'flora',
  machinery: 'camp',
  prop: 'camp',
  vehicle: 'vehicle',
  static_creature: 'monument',
};
// Classes that must NEVER auto-place even though they shipped as browsable props:
// a floating pistol in a meadow reads as a bug, and creatures belong to spawn
// logic rather than scenery.
const VISION_NEVER = new Set([
  'weapon', 'quadruped', 'biped_monster', 'serpent', 'insect_arachnid', 'winged',
  'floating', 'amorphous', 'humanoid_misgated', 'junk', 'duplicate', 'ip_risk',
]);
const visionByTail = (() => {
  const map = new Map();
  const f = '/opt/cryptic-realm/tmp/nonhum_decisions.csv';
  if (!existsSync(f)) return map;
  for (const line of readFileSync(f, 'utf8').split('\n').slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split(',');
    const id = (cells[0] || '').trim();
    const cls = (cells[2] || '').trim();
    if (id && cls) map.set(id.slice(0, 8).toLowerCase(), cls);
  }
  return map;
})();

const ROLE_BY_REVIEW_BUCKET = {
  vehicle_ground: 'vehicle',
  ship_or_aircraft: 'ship',
  mech_robot: 'mech',
  turret_or_emplacement: 'turret',
};

// Decor nouns. A scenery prop is admitted only if one of its slug WORDS is here
// (word match, never substring: "towering" must not read as "ring").
const SCENERY_ROLE_WORDS = {
  flora: [
    'tree', 'trees', 'treehouse', 'grove', 'forest', 'palm', 'stump', 'cactus',
    'plant', 'mushroom', 'mushrooms', 'bamboo', 'willow', 'oak', 'pine', 'bush',
    'shrub', 'coral', 'flower', 'flowers', 'blossom', 'fern', 'thicket', 'foliage',
  ],
  monument: [
    'statue', 'statues', 'sculpture', 'monument', 'monumental', 'obelisk',
    'monolith', 'totem', 'idol', 'shrine', 'altar', 'pillar', 'pillars', 'column',
    'columns', 'arch', 'archway', 'gate', 'gateway', 'portal', 'spire', 'stele',
    'tomb', 'grave', 'gravestone', 'headstone', 'sarcophagus', 'mausoleum',
    'memorial', 'fountain', 'well', 'brazier', 'beacon', 'lantern', 'lamp',
    'lamppost', 'torch', 'banner', 'signpost', 'runestone', 'runes', 'shard',
    'crystal', 'geode', 'amethyst', 'boulder', 'rock', 'stonehenge', 'effigy',
    'relic', 'reliquary', 'throne', 'sundial', 'orb',
  ],
  camp: [
    'crate', 'crates', 'barrel', 'barrels', 'cart', 'wagon', 'tent', 'campfire',
    'bonfire', 'debris', 'wreck', 'wreckage', 'rubble', 'ruin', 'ruins',
    'barricade', 'sandbag', 'chest', 'anvil', 'forge', 'cauldron', 'scaffold',
    'bridge', 'windmill', 'scarecrow', 'haystack', 'cage', 'pyre', 'clock',
    'oasis', 'diorama', 'engine', 'machine', 'device', 'onager', 'ballista',
    'catapult', 'trebuchet',
  ],
};

// Words that mean the mesh is a WEARABLE, a bust, or a character study rather
// than world dressing. Applied to every bucket, including the ones admitted
// wholesale, because the review buckets are coarse (there are humanoid busts
// filed under building_structure).
//
// Split in two only to name the two different KINDS of ban; both are absolute.
// A WEARABLE word says the mesh is a thing you hold or wear. A MASCOT word says
// the SUBJECT is a novelty - no bucket makes a pumpkin mech or a santa sleigh
// acceptable standing in a field in July.
//
// Neither half is overridable, INCLUDING by the reviewed table below, because
// tests/realm_decor.test.ts pins the whole catalogue against these words. That
// pin costs one real asset (a starship slugged `azure_ring_voyager`, filed under
// ships, rejected for the word 'ring') and it is worth it: the guard protects
// 800-odd rows from exactly the mistake a single-asset exception would open.
const WEARABLE_WORDS = new Set([
  'bust', 'busts', 'mask', 'helmet', 'crown', 'ring', 'rings', 'coin', 'penny',
  'emblem', 'portrait', 'painting', 'canvas', 'figurine', 'gauntlet', 'cocktail',
  'computer', 'chibi', 'necklace', 'amulet', 'pendant', 'earring', 'jewelry',
  'tiara', 'brooch', 'face', 'head', 'heads', 'hair', 'tattoo', 'logo', 'card',
  'poster', 'sticker', 'avatar', 'selfie', 'cosplay', 'outfit', 'streetwear',
  'bikini', 'dress', 'shoe', 'shoes', 'sneaker', 'boots', 'backpack', 'wallet',
  'phone', 'guitar', 'burger', 'pizza', 'cake', 'donut', 'candy', 'birthday',
]);
// Novelty / holiday SUBJECTS. The seasonal drop TAGS ('_thanksgiving',
// '_christmas2025') are deliberately still allowed: those mark ordinary keeps,
// ruins and towers from a seasonal batch. What must not stand in a field all
// year is the mascot itself. ('hear' is not a typo - the store truncates slugs
// at 48 characters, so the glowing cartoon heart arrives as ...glowing_hear.)
const MASCOT_WORDS = new Set([
  'heart', 'hear', 'valentine', 'santa', 'claus', 'sleigh', 'snowman', 'pumpkin',
  'bunny', 'wreath', 'stocking', 'elf', 'balloon', 'ornament',
]);

// Rows a human RENDERED AND LOOKED AT, keyed by the store slug's 8-hex tail.
//
// The vocabulary gate below admits a scenery prop only when one of its slug
// WORDS is a known decor noun, which is why it is blind to a machine whose only
// name is `neon_elixir_chamber` or a rotunda mis-slugged `gaunt_revenant_...`.
// Widening the noun lists to reach those would sweep in every unreviewed asset
// that happens to share a word ('core' also names a dozen cybernetic skulls), so
// each entry here is instead an individual verdict from a contact sheet.
//
// This is deliberately a committed table rather than another row in
// tmp/nonhum_decisions.csv: tmp/ is gitignored, so a verdict left there is lost
// on the next container wipe and the asset silently falls back out of the world.
//
// Reviewed 2026-08-08 against /tmp/thin_sheet contact sheets (thin realms).
const REVIEWED_DECOR = new Map([
  // arcadevoid: neon machinery. Reads as powered industrial dressing, which is
  // exactly what this realm's `camp` band was empty of.
  ['019a5b87', 'camp'], // energy_core_apparatus
  ['019ab1d6', 'camp'], // futuristic_control_console
  ['01998c53', 'camp'], // galactic_power_core
  ['01998c59', 'camp'], // galactic_power_core
  ['019a6964', 'camp'], // neon_elixir_chamber
  ['019a69a6', 'camp'], // neon_elixir_chamber
  ['019a737d', 'camp'], // neon_reactor_core
  ['019a794c', 'camp'], // quantum_core_generator
  ['019ab668', 'camp'], // retro_tech_fusion (CRT/console stack)
  // arcane
  ['019a7391', 'flora'], // enchanted_glade - stylised broadleaf tree
  // crypticrealm
  ['0197b996', 'camp'], // cursed_coast_ocean - carved harbour signpost
  // exchange: a gold rotunda whose slug says 'revenant'. The name is wrong; the
  // mesh is a domed columned pavilion.
  ['0193ea7d', 'monument'], // gaunt_revenant_written_in_gold
  // NOT admitted, recorded so the next pass does not re-litigate them:
  //   0196686a the_haunted_grove - reads as a tree, but a previous reviewer
  //     filed it `biped_monster` and a human verdict beats a thumbnail glance.
  //   0198449d andean_gold_figurine - a figurine, which is what the ban is for.
  //   019e142c azure_ring_voyager - a genuine starship blocked by 'ring'; see
  //     the note on WEARABLE_WORDS for why the guard keeps its win here.
]);

const HEX_TAIL = /_[0-9a-f]{6,}$/i;

export function slugWords(file) {
  return file.replace(HEX_TAIL, '').split(/[^a-z0-9]+/i).filter(Boolean).map((w) => w.toLowerCase());
}

/** The decor role for a store row, or null when it must never auto-place. */
export function classifyDecor(file, reviewBucket) {
  const words = slugWords(file);
  for (const w of words) if (MASCOT_WORDS.has(w) || WEARABLE_WORDS.has(w)) return null;
  // classifyDecor is called with the extension ALREADY stripped, so make it optional.
  const tail = (file.match(/([0-9a-f]{8})(?:\.glb)?$/i) || [])[1];
  const id = tail ? tail.toLowerCase() : undefined;
  // A verdict from someone who rendered the thing beats every guess below it.
  const reviewed = id ? REVIEWED_DECOR.get(id) : undefined;
  if (reviewed) return reviewed;
  const seen = id ? visionByTail.get(id) : undefined;
  if (seen) {
    if (VISION_NEVER.has(seen)) return null;
    const role = VISION_ROLE[seen];
    if (role) return role;
  }
  const direct = ROLE_BY_REVIEW_BUCKET[reviewBucket];
  if (direct) return direct;
  if (reviewBucket === 'building_structure') return 'structure';
  if (reviewBucket !== 'scenery_prop' && reviewBucket !== 'props') return null;
  for (const [role, list] of Object.entries(SCENERY_ROLE_WORDS)) {
    for (const w of words) if (list.includes(w)) return role;
  }
  return null;
}

// ── build ───────────────────────────────────────────────────────────────────

function readReviewIndex(store) {
  const dir = join(store, 'review');
  const byUrl = new Map();
  if (!existsSync(dir)) return byUrl;
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('data_') || !f.endsWith('.json') || f.includes('_bodies')) continue;
    let rows;
    try {
      rows = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    } catch {
      continue;
    }
    for (const r of rows) if (r && typeof r.url === 'string') byUrl.set(r.url, r);
  }
  return byUrl;
}

function round(n, digits) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function build() {
  const review = readReviewIndex(STORE);
  const catalog = new Map();
  const rejected = [];
  let scanned = 0;
  for (const realm of readdirSync(STORE).sort()) {
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(realm)) continue;
    if (!statSync(join(STORE, realm)).isDirectory()) continue;
    for (const bucket of BUCKETS) {
      const dir = join(STORE, realm, bucket);
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir).sort()) {
        if (!name.endsWith('.glb')) continue;
        scanned++;
        const file = name.slice(0, -4);
        const url = `/cr-realms/${realm}/${bucket}/${name}`;
        const row = review.get(url);
        const flags = Array.isArray(row?.flags) ? row.flags : [];
        if (flags.includes('ip')) {
          rejected.push([url, 'ip-flagged']);
          continue;
        }
        const role = classifyDecor(file, row?.bucket ?? '');
        if (!role) {
          rejected.push([url, `not-decor(${row?.bucket ?? 'unknown'})`]);
          continue;
        }
        const m = measureGlb(join(dir, name));
        if (!m || m.tris <= 0) {
          rejected.push([url, 'unmeasurable']);
          continue;
        }
        const [sx, sy, sz] = m.size;
        if (!(sy > 1e-4)) {
          rejected.push([url, 'flat']);
          continue;
        }
        const maxDim = Math.max(sx, sy, sz);
        const kb = Math.round(statSync(join(dir, name)).size / 1024);
        if (!catalog.has(realm)) catalog.set(realm, []);
        catalog.get(realm).push({
          key: `realm:${realm}/${bucket}/${file}`,
          role,
          tris: m.tris,
          kb,
          // The renderer normalizes an arbitrary GLB by its LONGEST axis, so a
          // placement that wants a given world HEIGHT needs this ratio.
          aspect: round(maxDim / sy, 3),
          // Horizontal half-extent per unit of height: the clear radius a
          // placement of height h needs is foot * h.
          foot: round(Math.max(sx, sz) / 2 / sy, 3),
        });
      }
    }
  }
  for (const list of catalog.values()) list.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { catalog, rejected, scanned };
}

// The build only runs when this file is INVOKED, so tests can import the
// classifier and the GLB measurer without writing a generated module.
function main() {
  const { catalog, rejected, scanned } = build();

  const realms = [...catalog.keys()].sort();
  const lines = [];
  lines.push('// GENERATED by scripts/realm_assets/emit_decor.mjs — do not edit by hand.');
  lines.push('//');
  lines.push('// The auto-decoration catalogue: every shipped realm-store GLB that is safe to');
  lines.push('// place in a world WITHOUT a human choosing it. Rows carry the measured cost');
  lines.push('// (triangles, KB) and shape (aspect, foot) the placer budgets and scales with,');
  lines.push('// so the solver never needs to load a GLB to decide anything.');
  lines.push('//');
  lines.push(`// ${scanned} store GLBs scanned, ${realms.reduce((s, r) => s + catalog.get(r).length, 0)} admitted.`);
  lines.push('// Held items (melee/weapons), rows flagged `ip`, and scenery that is really a');
  lines.push('// bust/mask/wearable are excluded — see the script header for why.');
  lines.push('');
  lines.push("import type { RealmDecorAsset } from './realm_decor_types';");
  lines.push('');
  lines.push('export const REALM_DECOR_CATALOG: Readonly<Record<string, readonly RealmDecorAsset[]>> = {');
  for (const realm of realms) {
    lines.push(`  ${realm}: [`);
    for (const a of catalog.get(realm)) {
      lines.push(
        `    { key: '${a.key}', role: '${a.role}', tris: ${a.tris}, kb: ${a.kb}, aspect: ${a.aspect}, foot: ${a.foot} },`,
      );
    }
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');

  writeFileSync(OUT, lines.join('\n'));

  const counts = {};
  for (const realm of realms) {
    const byRole = {};
    for (const a of catalog.get(realm)) byRole[a.role] = (byRole[a.role] || 0) + 1;
    counts[realm] = byRole;
  }
  process.stderr.write(
    `emit_decor: scanned ${scanned}, admitted ${realms.reduce((s, r) => s + catalog.get(r).length, 0)}, rejected ${rejected.length}\n` +
      `${JSON.stringify(counts, null, 1)}\n-> ${OUT}\n`,
  );
  if (REPORT) writeFileSync(REPORT, JSON.stringify({ counts, rejected }, null, 1));
}

if (process.argv[1] && process.argv[1].endsWith('emit_decor.mjs')) main();
