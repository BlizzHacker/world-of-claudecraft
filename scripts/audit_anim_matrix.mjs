// Animation audit matrix: for every VISUALS key, sniff the skeleton family
// from the GLB, mirror the runtime clip-resolution chain (prepareVisual's
// autoClip / scoped death-sit remap, the CharacterVisual ctor's full
// resolveClipMap, the action set bound from clipNamesOf, and baseAction()'s
// per-BaseState fallbacks) and mark each state OWN / BANK / FALLBACK / DEAD.
// Then cross-join the player-facing keys with each class's ability kit to list
// ability ids that have no dedicated attack gesture on that rig.
//
// Writes the generated report to docs/anim-audit-matrix.md with the manifest
// fingerprint noted (sha256 over the VISUALS key/url/animUrls/clip tables), so
// a stale report is detectable against the manifest that produced it.
//
// GLBs under the out-of-band realm store (/cr-realms/**) are usually NOT on a
// local checkout (the same reason tests/character_clipmaps.test.ts ENOENTs
// locally); those keys are reported in their own store-only section instead of
// being guessed at. TS tables come in via the esbuild stdin-bundle pattern
// (scripts/export_loot_spreadsheet.mjs).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = process.cwd();

const entrySource = `
  export { VISUALS, visualAssetUrlForGraphics } from './src/render/characters/manifest.ts';
  export { resolveClipMap, resolveClipMapScoped } from './src/render/characters/clip_resolution.ts';
  export { ABILITIES } from './src/sim/data.ts';
  export { ALL_CLASSES } from './src/sim/types.ts';
`;

const build = await esbuild.build({
  stdin: {
    contents: entrySource,
    resolveDir: root,
    sourcefile: 'anim-audit-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
});
const dataUrl = `data:text/javascript;base64,${Buffer.from(build.outputFiles[0].text).toString('base64')}`;
const {
  ABILITIES,
  ALL_CLASSES,
  VISUALS,
  resolveClipMap,
  resolveClipMapScoped,
  visualAssetUrlForGraphics,
} = await import(dataUrl);

// ---------------------------------------------------------------------------
// GLB JSON-chunk reader (the dependency-free pattern from
// tests/character_clipmaps.test.ts, extended to nodes/skins/channels so the
// audit can sniff skeleton families and drop donor clips that drive no bone).
// ---------------------------------------------------------------------------
const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

function glbJson(publicPath) {
  const buf = readFileSync(publicPath);
  if (buf.length <= 12 || buf.readUInt32LE(0) !== GLB_MAGIC)
    throw new Error(`${publicPath} is not a GLB`);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    if (type === CHUNK_JSON)
      return JSON.parse(buf.toString('utf8', offset + 8, offset + 8 + length));
    offset += 8 + length + ((4 - (length % 4)) % 4); // chunks are 4-byte aligned
  }
  throw new Error(`${publicPath} has no JSON chunk`);
}

function publicPathOf(url) {
  return path.join(root, 'public', url.replace(/^\//, ''));
}

const glbCache = new Map();
/** { clips: Map<name, Set<targetNodeName>>, nodeNames: Set, joints: string[] } */
function readGlb(url) {
  const hit = glbCache.get(url);
  if (hit !== undefined) return hit;
  const p = publicPathOf(url);
  let out = null;
  if (existsSync(p)) {
    const json = glbJson(p);
    const nodes = json.nodes ?? [];
    const nodeNames = new Set(nodes.map((n) => n.name ?? '').filter(Boolean));
    const joints = (json.skins?.[0]?.joints ?? [])
      .map((idx) => nodes[idx]?.name ?? '')
      .filter(Boolean);
    const clips = new Map();
    for (const anim of json.animations ?? []) {
      const targets = new Set();
      for (const ch of anim.channels ?? []) {
        const nodeIdx = ch.target?.node;
        const name = typeof nodeIdx === 'number' ? (nodes[nodeIdx]?.name ?? '') : '';
        if (name) targets.add(name);
      }
      clips.set(anim.name ?? '', targets);
    }
    out = { clips, nodeNames, joints };
  }
  glbCache.set(url, out);
  return out;
}

/** Skeleton family sniff over the rig's joint (or node) names. */
function sniffFamily(glb) {
  const names = glb.joints.length ? glb.joints : [...glb.nodeNames];
  const jointCount = glb.joints.length;
  if (names.includes('Hips')) return `meshy${jointCount || names.length}`;
  if (names.some((n) => n === 'hips' || n.startsWith('handslot'))) return 'kaykit';
  if (jointCount === 0) return 'unskinned';
  return `other(${names[0] ?? '?'})`;
}

// ---------------------------------------------------------------------------
// Runtime mirrors: clipNamesOf (visual.ts) and baseAction() fallback chains.
// ---------------------------------------------------------------------------
function clipNamesOf(clips) {
  return [
    clips.idle,
    clips.walk,
    clips.run,
    clips.death,
    ...(clips.attack ?? []),
    ...Object.values(clips.attackByAbility ?? {}),
    ...Object.values(clips.attackByHand ?? {}),
    ...(clips.hit ?? []),
    clips.cast,
    clips.sitDown,
    clips.sitIdle,
    clips.swim,
    clips.swimSurface,
    clips.swimIdle,
    clips.wade,
    clips.jump,
    clips.fall,
    clips.land,
    clips.walkBack,
    clips.flourish,
    clips.stow,
    ...Object.values(clips.emote ?? {}).flatMap((spec) => spec.clips),
  ].filter(Boolean);
}

// baseAction() fallback order per BaseState (visual.ts). 'spin' reads
// attack[0]; every other entry is a plain ClipMap field walk.
const BASE_STATE_CHAINS = {
  idle: ['idle'],
  walk: ['walk', 'idle'],
  walkBack: ['walkBack', 'walk'],
  run: ['run', 'walk'],
  cast: ['cast', 'idle'],
  spin: ['attack0', 'idle'],
  swim: ['swim', 'idle'],
  swimSurface: ['swimSurface', 'swim', 'idle'],
  swimIdle: ['swimIdle', 'swimSurface', 'swim', 'idle'],
  wade: ['wade', 'walk', 'idle'],
  sit: ['sitDown', 'sitIdle', 'idle'],
  jump: ['jump', 'idle'],
  fall: ['fall', 'jump', 'idle'],
};
// enterDeath() has no fallback chain: the corpse holds its pose when the death
// clip resolves no action. Reported as an extra column beside the BaseStates.
const EXTRA_CHAINS = { death: ['death'] };
const ALL_COLUMNS = [...Object.keys(BASE_STATE_CHAINS), ...Object.keys(EXTRA_CHAINS)];

function fieldClip(clips, field) {
  if (field === 'attack0') return (clips.attack ?? [])[0];
  return clips[field];
}

/**
 * Mirror the full runtime resolution for one def against its readable GLBs.
 * Returns { family, cells: {state: cell}, inventory facts } or null when the
 * body GLB is not locally readable (store-only).
 */
function auditDef(def) {
  const bodyUrl = visualAssetUrlForGraphics(def.url, true);
  const body = readGlb(bodyUrl);
  if (!body) return null;
  const ownSet = new Set(body.clips.keys());
  const bankSet = new Set();
  const missingBanks = [];
  for (const url of def.animUrls ?? []) {
    const donor = readGlb(visualAssetUrlForGraphics(url, true));
    if (!donor) {
      missingBanks.push(url);
      continue;
    }
    for (const [name, targets] of donor.clips) {
      // Mirror assets.ts clipDrivesRig: a donor clip that drives no node on
      // this rig never merges (three would bind nothing).
      if (ownSet.has(name) || bankSet.has(name)) continue;
      let drives = false;
      for (const t of targets) {
        if (body.nodeNames.has(t)) {
          drives = true;
          break;
        }
      }
      if (drives) bankSet.add(name);
    }
  }
  const inventory = [...ownSet, ...bankSet];

  // prepareVisual: autoClip full resolution, else the scoped death/sit remap.
  let prepClips = def.clips;
  if (def.autoClip) {
    prepClips = resolveClipMap(prepClips, inventory);
  } else {
    prepClips = resolveClipMapScoped(prepClips, inventory, ['death', 'sitDown']) ?? prepClips;
  }
  // CharacterVisual ctor: actions bind from clipNamesOf(prep.def), then the
  // def is fully re-resolved for dispatch.
  const actionNames = new Set(
    clipNamesOf(prepClips).filter((n) => ownSet.has(n) || bankSet.has(n)),
  );
  const resolved = resolveClipMap(prepClips, inventory);

  const cells = {};
  for (const [state, chain] of [
    ...Object.entries(BASE_STATE_CHAINS),
    ...Object.entries(EXTRA_CHAINS),
  ]) {
    let cell = 'DEAD';
    for (let i = 0; i < chain.length; i++) {
      const name = fieldClip(resolved, chain[i]);
      if (!name || !actionNames.has(name)) continue;
      if (i === 0) cell = `${ownSet.has(name) ? 'OWN' : 'BANK'}:${name}`;
      else cell = `FB:${chain[i]}>${name}`;
      break;
    }
    cells[state] = cell;
  }
  return { family: sniffFamily(body), cells, missingBanks, resolved, actionNames, ownSet };
}

// ---------------------------------------------------------------------------
// Run the audit over every VISUALS key.
// ---------------------------------------------------------------------------
const keys = Object.keys(VISUALS).sort();
const rows = [];
const storeOnly = [];
for (const key of keys) {
  const def = VISUALS[key];
  const audit = auditDef(def);
  if (!audit) {
    storeOnly.push({ key, url: def.url });
    continue;
  }
  rows.push({ key, ...audit });
}

// Player-facing keys x class kits: ability ids with no dedicated gesture (no
// attackByAbility entry, or one naming a clip the rig cannot resolve).
const gestureGaps = [];
for (const cls of ALL_CLASSES) {
  const key = `player_${cls}`;
  const def = VISUALS[key];
  if (!def) continue;
  const audit = rows.find((r) => r.key === key) ?? null;
  const kit = Object.values(ABILITIES)
    .filter((a) => a.class === cls)
    .map((a) => a.id)
    .sort();
  const missing = kit.filter((id) => {
    const clip = def.clips.attackByAbility?.[id];
    if (!clip) return true;
    // With a readable GLB, an authored gesture whose clip never binds is a
    // gap too (hasAttackClipOverride would return false at runtime).
    return audit ? !audit.actionNames.has(clip) : false;
  });
  gestureGaps.push({ cls, key, kitSize: kit.length, missing, verifiable: audit !== null });
}

// Manifest fingerprint: the audit's exact inputs from the manifest side.
const fingerprint = createHash('sha256')
  .update(
    JSON.stringify(
      keys.map((k) => [k, VISUALS[k].url, VISUALS[k].animUrls ?? [], VISUALS[k].clips]),
    ),
  )
  .digest('hex');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const lines = [];
lines.push('# Animation audit matrix');
lines.push('');
lines.push('GENERATED FILE: do not hand-edit. Regenerate with:');
lines.push('');
lines.push('    node scripts/audit_anim_matrix.mjs');
lines.push('');
lines.push(
  `Store manifest fingerprint (sha256 over the VISUALS key/url/animUrls/clip tables): \`${fingerprint}\``,
);
lines.push('');
lines.push('Cell legend, mirroring the runtime chain (prepareVisual resolution, the');
lines.push('CharacterVisual action bind from clipNamesOf, resolveClipMap, then the');
lines.push('baseAction() fallbacks in src/render/characters/visual.ts):');
lines.push('');
lines.push("- `OWN:<clip>`: the state's own field resolves to a clip in the body GLB.");
lines.push("- `BANK:<clip>`: the state's own field resolves via an animUrls donor bank.");
lines.push('- `FB:<field>><clip>`: the own field is unresolvable; a later baseAction()');
lines.push('  fallback field carries the pose.');
lines.push('- `DEAD`: nothing in the fallback chain resolves an action; the mixer keeps');
lines.push('  whatever pose was last driving the rig.');
lines.push('- The `death` column mirrors enterDeath(), which has NO fallback chain: a');
lines.push('  DEAD death means the corpse deliberately holds its last pose.');
lines.push('');
lines.push('Keys whose GLB lives only in the out-of-band /cr-realms store are listed');
lines.push('separately: their clips cannot be verified from a local checkout (the same');
lines.push('reason tests/character_clipmaps.test.ts ENOENTs locally).');
lines.push('');
lines.push('## Locally verifiable rigs');
lines.push('');
lines.push(`| key | family | ${ALL_COLUMNS.join(' | ')} |`);
lines.push(`|---|---|${ALL_COLUMNS.map(() => '---').join('|')}|`);
for (const row of rows) {
  const cells = ALL_COLUMNS.map((s) => row.cells[s]).join(' | ');
  const family = row.missingBanks.length
    ? `${row.family} (bank missing: ${row.missingBanks.join(', ')})`
    : row.family;
  lines.push(`| ${row.key} | ${family} | ${cells} |`);
}
lines.push('');
lines.push('## Dead states on locally verifiable rigs');
lines.push('');
lines.push('Deliberately clip-less prop rigs (the CLIPLESS_RIGS exemptions pinned in');
lines.push('tests/character_clipmaps.test.ts: prop-lane mounts, egg/wisp props, NPC');
lines.push('furniture) are EXPECTED to read all-DEAD here; anything else is a finding.');
lines.push('');
const deadRows = rows
  .map((row) => ({
    key: row.key,
    dead: ALL_COLUMNS.filter((s) => row.cells[s] === 'DEAD'),
  }))
  .filter((r) => r.dead.length > 0);
if (deadRows.length === 0) {
  lines.push('None.');
} else {
  for (const r of deadRows) lines.push(`- ${r.key}: ${r.dead.join(', ')}`);
}
lines.push('');
lines.push('## Ability ids with no dedicated attack gesture (player keys x class kits)');
lines.push('');
lines.push('An ability with no attackByAbility clip swings the generic weapon rotation');
lines.push('(playAttack); this section lists where a bespoke gesture could land.');
lines.push('');
for (const gap of gestureGaps) {
  const suffix = gap.verifiable
    ? ''
    : ' (rig unverifiable locally: authored entries taken at face value)';
  lines.push(
    `### ${gap.cls} (${gap.key}), ${gap.missing.length} of ${gap.kitSize} abilities without a gesture${suffix}`,
  );
  lines.push('');
  lines.push(gap.missing.length ? gap.missing.join(', ') : 'Full coverage.');
  lines.push('');
}
lines.push('## Store-only keys (GLB not in this checkout)');
lines.push('');
const byDir = new Map();
for (const s of storeOnly) {
  const dir = s.url.replace(/\/[^/]*$/, '');
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(s.key);
}
lines.push(`${storeOnly.length} keys resolve to GLBs served out-of-band. By directory:`);
lines.push('');
for (const [dir, dirKeys] of [...byDir.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`- \`${dir}\` (${dirKeys.length}): ${dirKeys.join(', ')}`);
}
lines.push('');

const outPath = path.join(root, 'docs', 'anim-audit-matrix.md');
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'));
console.log(
  `Wrote ${path.relative(root, outPath)}: ${rows.length} verifiable rigs, ${storeOnly.length} store-only keys, ${deadRows.length} rigs with dead states.`,
);
