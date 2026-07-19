#!/usr/bin/env node

// Sync Meshy/local realm GLBs into the generated runtime manifest and the
// ArcForge forged store. This script only lists/downloads existing Meshy tasks;
// it does not spend generation, rigging, or animation credits.

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '..');
const OUT = path.join(REPO, 'public', 'cr-realms');
const MESHY_DOWNLOAD_DIR = path.join(REPO, 'tmp', 'meshy-api-downloads');
const TOKEN_FILE = path.join(REPO, 'crypticrealm-meshy-api.txt');
const MESHY_API_BASE = 'https://api.meshy.ai';

const USB4_FORGED_DIR =
  process.platform === 'win32'
    ? path.win32.join('C:\\', 'mnt', 'usb4', 'moveweight-assets', 'forged-glbs')
    : '/mnt/usb4/moveweight-assets/forged-glbs';
// CI runners do not have the production USB4 mount. Keep generated manifests and
// forged copies inside the disposable workspace there, while production retains
// the canonical shared store unless an operator explicitly overrides it.
const DEFAULT_FORGED_DIR =
  process.env.CI === 'true' ? path.join(REPO, 'tmp', 'forged-glbs') : USB4_FORGED_DIR;

// Optional mounted libraries are opt-in so CI and contributors without the
// shared drives keep the same deterministic source set. PICKTURA_ROOT should
// point at T:\meshy\PICKTURA on the Windows workstation or the equivalent
// mounted directory in an asset staging job.
const PICKTURA_ROOT = process.env.PICKTURA_ROOT?.trim()
  ? path.resolve(process.env.PICKTURA_ROOT.trim())
  : '';
const INFERNAL_WAYPOINT_GLB = process.env.INFERNAL_WAYPOINT_GLB?.trim()
  ? path.resolve(process.env.INFERNAL_WAYPOINT_GLB.trim())
  : '';
const INFERNAL_DURANCE_HUMANOID_GLB = process.env.INFERNAL_DURANCE_HUMANOID_GLB?.trim()
  ? path.resolve(process.env.INFERNAL_DURANCE_HUMANOID_GLB.trim())
  : '';
const INFERNAL_DURANCE_ANIM_DIR = process.env.INFERNAL_DURANCE_ANIM_DIR?.trim()
  ? path.resolve(process.env.INFERNAL_DURANCE_ANIM_DIR.trim())
  : '';
const INFERNAL_ASSET_ROOT = process.env.INFERNAL_ASSET_ROOT?.trim()
  ? path.resolve(process.env.INFERNAL_ASSET_ROOT.trim()) : '';
const CRYPTIC_ASSET_ROOT = process.env.CRYPTIC_ASSET_ROOT?.trim()
  ? path.resolve(process.env.CRYPTIC_ASSET_ROOT.trim()) : '';
const INFERNAL_DARK_PALADIN_GLB = process.env.INFERNAL_DARK_PALADIN_GLB?.trim()
  ? path.resolve(process.env.INFERNAL_DARK_PALADIN_GLB.trim()) : '';
const INFERNAL_DARK_PALADIN_ANIM_DIR = process.env.INFERNAL_DARK_PALADIN_ANIM_DIR?.trim()
  ? path.resolve(process.env.INFERNAL_DARK_PALADIN_ANIM_DIR.trim()) : '';
const PICKTURA_INCLUDE = process.env.PICKTURA_INCLUDE?.trim()
  ? new RegExp(process.env.PICKTURA_INCLUDE.trim(), 'i')
  : null;
const PICKTURA_FORMATS = new Set(
  (process.env.PICKTURA_FORMATS?.trim() || 'animated,glb')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const FORGED_DIR = path.resolve(
  process.env.ARCFORGE_FORGED_DIR?.trim() ? process.env.ARCFORGE_FORGED_DIR : DEFAULT_FORGED_DIR,
);

const REALMS = [
  { realmId: 'crypticrealm', name: 'Cryptic Realm' },
  { realmId: 'infernal', name: 'Infernal Realm' },
  { realmId: 'classic', name: 'Classic Realm' },
  { realmId: 'dominion', name: 'Dominion Realm' },
  { realmId: 'arcane', name: 'Arcane Nexus' },
  { realmId: 'arcadevoid', name: 'Arcane Void' },
  { realmId: 'claudecraft', name: 'Claudecraft' },
  { realmId: 'fps', name: 'FPS Realm' },
  { realmId: 'exchange', name: 'The Exchange' },
];

const REALM_IDS = new Set(REALMS.map((r) => r.realmId));

const FOLDER_TO_REALM = {
  'cryptic realm assets': 'crypticrealm',
  'infernal realm assets': 'infernal',
  'classic realm assets': 'classic',
  'claudcraft realm assets': 'claudecraft',
  'arcade void realm assets': 'arcadevoid',
  'arcane void realm assets': 'arcadevoid',
};

const MESHY_LIST_ENDPOINTS = [
  { label: 'text-to-3d', path: '/openapi/v2/text-to-3d' },
  { label: 'image-to-3d', path: '/openapi/v1/image-to-3d' },
  { label: 'rigging', path: '/openapi/v1/rigging' },
  { label: 'animations', path: '/openapi/v1/animations' },
  { label: 'remesh', path: '/openapi/v1/remesh' },
];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const SKIP_API = args.has('--skip-api');
const API_ONLY = args.has('--api-only');
const MAX_PER_REALM = positiveInt(process.env.REALM_ASSET_LIMIT);
const MAX_BYTES_PER_FILE = positiveInt(process.env.REALM_ASSET_MAX_MB)
  ? positiveInt(process.env.REALM_ASSET_MAX_MB) * 1024 * 1024
  : null;

let gltfIoPromise = null;

function positiveInt(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function looksAnimatedName(filename) {
  return /(?:^|[_\-\s])(?:meshy_)?merged[_\-\s]?animations(?:$|[_\-\s.])|(?:^|[_\-\s])animated(?:$|[_\-\s.])|(?:^|[_\-\s])anim(?:$|[_\-\s.])/i.test(
    filename,
  );
}

export function safeAssetName(raw) {
  const base = raw
    .replace(/\.(glb|gltf)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return base || 'asset';
}

function titleFromName(name) {
  return safeAssetName(name.replace(/\.[a-z0-9]+$/i, ''))
    .replace(/[_-]+/g, ' ')
    .replace(/\b[a-z]/g, (m) => m.toUpperCase())
    .trim();
}

function hashShort(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 8);
}

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function classifyRealmFromText(text, fallback = 'crypticrealm') {
  const n = normalizeText(text);
  if (
    /\b(starcraft|arcane void|arcade void|arcadevoid|space marine|protoss|zerg|terran|battlecruiser|spaceship|void)\b/.test(
      n,
    )
  ) {
    return 'arcadevoid';
  }
  if (
    /\b(infernal|demon|diablo|baal|butcher|hell|hellfire|crimson|brimstone|flame|dragon)\b/.test(n)
  ) {
    return 'infernal';
  }
  if (/\b(fps|gun|gunslinger|rifle|ranger|first person|shooter|soldier)\b/.test(n)) {
    return 'fps';
  }
  if (/\b(claude|claudcraft|claudecraft|minecraft|block|voxel)\b/.test(n)) {
    return 'claudecraft';
  }
  if (/\b(classic|warrior|huntress|sorceress|orc|goblin|dwarf|elf|queen|rider|knight|ninja)\b/.test(n)) {
    return 'classic';
  }
  if (/\b(arcane|mage|archmage|wizard|sorcerer|spell|rune|crystal|astral)\b/.test(n)) {
    return 'arcane';
  }
  if (/\b(dominion|empire|royal|soldier)\b/.test(n)) {
    return 'dominion';
  }
  if (/\b(exchange|market|merchant|vendor)\b/.test(n)) {
    return 'exchange';
  }
  return REALM_IDS.has(fallback) ? fallback : 'crypticrealm';
}

export function realmIdForFolder(folderName) {
  return FOLDER_TO_REALM[folderName.toLowerCase()] ?? classifyRealmFromText(folderName);
}

export function parsePickturaManifestCsv(text) {
  const lines = String(text ?? '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((field) => field.trim().toLowerCase());
  const indexOf = (...names) => names.map((name) => header.indexOf(name)).find((index) => index >= 0) ?? -1;
  const idIndex = indexOf('resultid', 'id');
  const filenameIndex = indexOf('filename');
  const actionIndex = indexOf('action');
  const kindIndex = indexOf('kind', 'format');
  const licenseIndex = indexOf('license');
  const authorIndex = indexOf('author');
  const bytesIndex = indexOf('bytes');
  const rows = [];
  for (const line of lines.slice(1)) {
    const fields = line.split(',');
    const filename = fields[filenameIndex]?.trim();
    if (!filename || !/\.glb$/i.test(filename) || /_armature\.glb$/i.test(filename)) continue;
    const row = {
      resultId: fields[idIndex]?.trim() ?? '',
      filename,
      action: fields[actionIndex]?.trim() ?? '',
      license: fields[licenseIndex]?.trim() ?? '',
      author: fields[authorIndex]?.trim() ?? '',
      bytes: Number(fields[bytesIndex]) || 0,
    };
    const kind = fields[kindIndex]?.trim() ?? '';
    if (kind) row.kind = kind;
    rows.push(row);
  }
  return rows;
}

export function classifyAssetKind(name, inspection = {}) {
  if (inspection.kind === 'character' || inspection.kind === 'vehicle' || inspection.kind === 'prop') {
    return inspection.kind;
  }
  const n = normalizeText(name);
  if (/\b(ship|spaceship|battlecruiser|cruiser|tank|mount|rider|dragon)\b/.test(n))
    return 'vehicle';
  if (
    /\b(portal|altar|base|tower|tree|rock|chest|crate|house|building|platform|weapon|sword|gun)\b/.test(
      n,
    )
  )
    return 'prop';
  if (inspection.skinned || inspection.animationNames?.length) return 'character';
  if (
    /\b(demon|baal|butcher|orc|warrior|queen|huntress|sorceress|hero|mech|marine|knight|ninja|gunslinger|behe|behemoth|herald|wolf|creature|monster)\b/.test(
      n,
    )
  ) {
    return 'character';
  }
  return 'prop';
}

async function readMeshyToken() {
  if (process.env.MESHY_API_TOKEN?.trim()) return process.env.MESHY_API_TOKEN.trim();
  try {
    return (await fs.readFile(TOKEN_FILE, 'utf8')).trim();
  } catch (err) {
    if (err.code === 'ENOENT') return '';
    throw err;
  }
}

async function getGltfIo() {
  if (!gltfIoPromise) {
    gltfIoPromise = (async () => {
      await MeshoptDecoder.ready;
      return new NodeIO()
        .registerExtensions(ALL_EXTENSIONS)
        .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    })();
  }
  return gltfIoPromise;
}

async function inspectGlb(fullPath) {
  try {
    const io = await getGltfIo();
    const doc = await io.read(fullPath);
    const root = doc.getRoot();
    const animationNames = root.listAnimations().map((a, i) => a.getName() || `Animation ${i + 1}`);
    return {
      meshCount: root.listMeshes().length,
      materialCount: root.listMaterials().length,
      textureCount: root.listTextures().length,
      skinned: root.listSkins().length > 0,
      animationNames,
    };
  } catch (err) {
    return {
      meshCount: 0,
      materialCount: 0,
      textureCount: 0,
      skinned: false,
      animationNames: [],
      inspectionError: err instanceof Error ? err.message : String(err),
    };
  }
}

async function walkFiles(dir) {
  const files = [];
  async function visit(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  await visit(dir);
  return files;
}

async function gatherLocalCandidates() {
  const candidates = [];
  for (const [folderName, realmId] of Object.entries(FOLDER_TO_REALM)) {
    const folder = path.join(REPO, folderName);
    const files = await walkFiles(folder);
    for (const full of files) {
      if (!/\.glb$/i.test(full)) continue;
      if (/\.crdownload$/i.test(full)) continue;
      const stat = await fs.stat(full);
      if (MAX_BYTES_PER_FILE && stat.size > MAX_BYTES_PER_FILE) continue;
      const relativePath = path.relative(REPO, full).replace(/\\/g, '/');
      candidates.push({
        source: 'local-folder',
        realmId,
        sourcePath: full,
        sourceName: path.basename(full),
        sourceRelative: relativePath,
        size: stat.size,
      });
    }
  }
  return candidates;
}

async function gatherPickturaCandidates() {
  if (!PICKTURA_ROOT) return [];
  const candidates = [];
  const sources = [
    ['animated', 'manifest.animated.csv'],
    ['glb', 'manifest.glb.csv'],
  ];
  for (const [format, manifestName] of sources) {
    if (!PICKTURA_FORMATS.has(format)) continue;
    const manifestPath = path.join(PICKTURA_ROOT, '_manifest', manifestName);
    const manifest = await fs.readFile(manifestPath, 'utf8').catch(() => '');
    for (const row of parsePickturaManifestCsv(manifest)) {
      if (PICKTURA_INCLUDE && !PICKTURA_INCLUDE.test(row.filename)) continue;
      const sourcePath = path.join(PICKTURA_ROOT, format === 'animated' ? 'animated' : 'glb', row.filename);
      const stat = await fs.stat(sourcePath).catch(() => null);
      if (!stat?.isFile()) continue;
      candidates.push({
        source: 'local-folder',
        realmId: classifyRealmFromText(row.filename, 'crypticrealm'),
        sourcePath,
        sourceName: row.filename,
        sourceRelative: `PICKTURA/${format}/${row.filename}`,
        size: stat.size,
        license: row.license,
        author: row.author,
        action: row.action,
        kind: format === 'glb' ? row.kind === 'prop' ? 'prop' : undefined : undefined,
      });
    }
  }
  return candidates;
}

async function gatherExplicitCandidates() {
  const explicit = [];
  if (INFERNAL_WAYPOINT_GLB) {
    const stat = await fs.stat(INFERNAL_WAYPOINT_GLB).catch(() => null);
    if (stat?.isFile() && /\.glb$/i.test(INFERNAL_WAYPOINT_GLB)) {
      explicit.push({
        source: 'local-folder',
        realmId: 'infernal',
        sourcePath: INFERNAL_WAYPOINT_GLB,
        sourceName: path.basename(INFERNAL_WAYPOINT_GLB),
        outputName: 'infernal_dungeon_entrance.glb',
        sourceRelative: path.basename(INFERNAL_WAYPOINT_GLB),
        size: stat.size,
        kind: 'prop',
      });
    }
  }

  // The named tester is deliberately curated as a humanoid. PICKTURA's
  // animated exports are one clip per GLB, so promote the compatible motion
  // donors alongside the walking body and expose them through animUrls in the
  // character manifest. This keeps DuranceTester out of the demon/boss pool.
  if (INFERNAL_DURANCE_HUMANOID_GLB) {
    const stat = await fs.stat(INFERNAL_DURANCE_HUMANOID_GLB).catch(() => null);
    if (stat?.isFile() && /\.glb$/i.test(INFERNAL_DURANCE_HUMANOID_GLB)) {
      explicit.push({
        source: 'local-folder',
        realmId: 'infernal',
        sourcePath: INFERNAL_DURANCE_HUMANOID_GLB,
        sourceName: path.basename(INFERNAL_DURANCE_HUMANOID_GLB),
        outputName: 'durance_tester_humanoid.glb',
        sourceRelative: path.basename(INFERNAL_DURANCE_HUMANOID_GLB),
        size: stat.size,
        kind: 'character',
      });
    }
  }
  if (INFERNAL_DURANCE_ANIM_DIR) {
    const donorActions = new Set([
      'Walking', 'Running', 'Attack', 'Axe_Spin_Attack', 'Double_Combo_Attack',
      'Charged_Spell_Cast', 'Dead', 'BeHit_FlyUp',
    ]);
    const files = await walkFiles(INFERNAL_DURANCE_ANIM_DIR);
    for (const sourcePath of files) {
      const sourceName = path.basename(sourcePath);
      if (!/\.glb$/i.test(sourceName) || /_armature\.glb$/i.test(sourceName)) continue;
      if (!/Ragged[_ -]?Warlord/i.test(sourceName)) continue;
      const action = sourceName.match(/__([^_]+(?:_[^_]+)*)\.glb$/i)?.[1] ?? '';
      if (!donorActions.has(action)) continue;
      const stat = await fs.stat(sourcePath);
      const outputName = `durance_tester_${safeAssetName(action)}.glb`;
      if (explicit.some((entry) => entry.outputName === outputName)) continue;
      explicit.push({
        source: 'local-folder', realmId: 'infernal', sourcePath, sourceName,
        outputName, sourceRelative: path.basename(sourcePath), size: stat.size,
        kind: 'character', action,
      });
    }
  }
  if (INFERNAL_DARK_PALADIN_GLB) {
    const stat = await fs.stat(INFERNAL_DARK_PALADIN_GLB).catch(() => null);
    if (stat?.isFile() && /\.glb$/i.test(INFERNAL_DARK_PALADIN_GLB)) {
      explicit.push({
        source: 'approved-asset', realmId: 'infernal', sourcePath: INFERNAL_DARK_PALADIN_GLB,
        sourceName: path.basename(INFERNAL_DARK_PALADIN_GLB),
        outputName: 'dark_paladin_commander.glb', sourceRelative: path.basename(INFERNAL_DARK_PALADIN_GLB),
        size: stat.size, kind: 'character', action: 'leader',
      });
    }
  }
  if (INFERNAL_DARK_PALADIN_ANIM_DIR) {
    const files = await walkFiles(INFERNAL_DARK_PALADIN_ANIM_DIR);
    for (const sourcePath of files) {
      const sourceName = path.basename(sourcePath);
      if (!/\.glb$/i.test(sourceName)) continue;
      const action = /Running/i.test(sourceName) ? 'running' : /Walking/i.test(sourceName) ? 'walking' : /Reaping_Swing/i.test(sourceName) ? 'reaping_swing' : '';
      if (!action) continue;
      const stat = await fs.stat(sourcePath);
      const outputName = `dark_paladin_${action}.glb`;
      if (explicit.some((entry) => entry.outputName === outputName)) continue;
      explicit.push({ source: 'approved-asset', realmId: 'infernal', sourcePath, sourceName,
        outputName, sourceRelative: sourceName, size: stat.size, kind: 'character', action });
    }
  }
  return explicit;
}

async function gatherApprovedAssetRoot(root, realmId) {
  if (!root) return [];
  const candidates = [];
  const stableNames = new Map([
    ['bone-herald-black-meshy_ai_meshy_merged_animations.glb', 'bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb'],
    ['demon-horned.glb', 'demon-horned_1a19d7ca.glb'],
    ['skullbeast.glb', 'skullbeast_5d2ecebf.glb'],
    ['meshy_ai_a_black_evil_spectr_0616234348_texture.glb', 'meshy_ai_a_black_evil_spectr_0616234348_texture_abacb7f9.glb'],
    ['meshy_ai_a_primal_groudon_emer_0616234337_texture.glb', 'meshy_ai_a_primal_groudon_emer_0616234337_texture_194376eb.glb'],
    ['meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations.glb', 'meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb'],
    ['meshy_ai_cursed_knight’s_iro_0616234359_texture.glb', 'meshy_ai_cursed_knight_s_iro_0616234359_texture_abda8208.glb'],
    ['meshy_ai_demon_with_body_cover_0616234415_texture.glb', 'meshy_ai_demon_with_body_cover_0616234415_texture_540be2b1.glb'],
    ['meshy_ai_demon_with_body_cover_0616234440_texture.glb', 'meshy_ai_demon_with_body_cover_0616234440_texture_fd4134d0.glb'],
    ['meshy_ai_horned_demon_warrior__0616234420_texture.glb', 'meshy_ai_horned_demon_warrior_0616234420_texture_2233cac0.glb'],
    ['meshy_ai_infernal_behemoth_biped_merged_animations.glb', 'meshy_ai_infernal_behemoth_biped_merged_animations.glb'],
    ['meshy_ai_inferno_dragon_majest_0616234236_texture.glb', 'meshy_ai_inferno_dragon_majest_0616234236_texture_aefc89dc.glb'],
    ['meshy_ai_lava_demon_visible_l_0616234410_texture.glb', 'meshy_ai_lava_demon_visible_l_0616234410_texture_a72a9ef6.glb'],
    ['meshy_ai_lava_demon_with_horns_0616234329_texture.glb', 'meshy_ai_lava_demon_with_horns_0616234329_texture_9a64c154.glb'],
  ]);
  for (const sourcePath of await walkFiles(root)) {
    const sourceName = path.basename(sourcePath);
    if (!/\.glb$/i.test(sourceName) || /_armature\.glb$/i.test(sourceName)) continue;
    const stat = await fs.stat(sourcePath);
    if (MAX_BYTES_PER_FILE && stat.size > MAX_BYTES_PER_FILE) continue;
    candidates.push({
      source: 'approved-asset', realmId, sourcePath, sourceName,
      sourceRelative: path.relative(root, sourcePath).replace(/\\/g, '/'), size: stat.size,
      ...(stableNames.get(sourceName.toLowerCase()) ? { outputName: stableNames.get(sourceName.toLowerCase()) } : {}),
    });
  }
  return candidates;
}

function readTaskList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function taskModelUrl(task) {
  return (
    task?.model_urls?.glb ||
    task?.modelUrls?.glb ||
    task?.output?.model_urls?.glb ||
    task?.result?.model_urls?.glb ||
    task?.glb_url ||
    task?.glbUrl ||
    task?.model_url ||
    ''
  );
}

function taskName(task, endpointLabel) {
  const prompt =
    task?.prompt ||
    task?.preview_prompt ||
    task?.negative_prompt ||
    task?.name ||
    task?.id ||
    endpointLabel;
  return String(prompt).slice(0, 96);
}

async function listMeshyTasks(token) {
  const found = [];
  const summary = [];
  for (const endpoint of MESHY_LIST_ENDPOINTS) {
    const url = new URL(endpoint.path, MESHY_API_BASE);
    url.searchParams.set('page_num', '1');
    url.searchParams.set('page_size', '50');
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        summary.push({ endpoint: endpoint.label, ok: false, count: 0, status: res.status });
        continue;
      }
      const payload = await res.json();
      const list = readTaskList(payload);
      summary.push({ endpoint: endpoint.label, ok: true, count: list.length, status: res.status });
      for (const task of list) found.push({ endpoint: endpoint.label, task });
    } catch (err) {
      summary.push({
        endpoint: endpoint.label,
        ok: false,
        count: 0,
        status: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { found, summary };
}

async function downloadMeshyCandidates(token) {
  const { found, summary } = await listMeshyTasks(token);
  const candidates = [];
  await fs.mkdir(MESHY_DOWNLOAD_DIR, { recursive: true });
  for (const row of found) {
    const url = taskModelUrl(row.task);
    if (!url) continue;
    const status = String(
      row.task?.status ?? row.task?.task_status ?? row.task?.state ?? '',
    ).toUpperCase();
    if (status && !['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'DONE'].includes(status)) continue;
    const name = taskName(row.task, row.endpoint);
    const realmId = classifyRealmFromText(`${name} ${row.endpoint}`, 'crypticrealm');
    const fileBase = `${safeAssetName(name)}_${hashShort(url)}.glb`;
    const dest = path.join(MESHY_DOWNLOAD_DIR, realmId, fileBase);
    if (!DRY_RUN) await fs.mkdir(path.dirname(dest), { recursive: true });
    let size = 0;
    try {
      const existing = await fs.stat(dest).catch(() => null);
      if (!existing && !DRY_RUN) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(dest, buf);
        size = buf.length;
      } else {
        size = existing?.size ?? 0;
      }
      if (MAX_BYTES_PER_FILE && size > MAX_BYTES_PER_FILE) continue;
      candidates.push({
        source: 'meshy-api',
        realmId,
        sourcePath: dest,
        sourceName: fileBase,
        sourceRelative: path.relative(REPO, dest).replace(/\\/g, '/'),
        size,
      });
    } catch {}
  }
  return { candidates, summary };
}

function candidateSort(a, b) {
  if (a.realmId !== b.realmId) return a.realmId.localeCompare(b.realmId);
  const aAnim = a.animationNames?.length || looksAnimatedName(a.sourceName) ? 1 : 0;
  const bAnim = b.animationNames?.length || looksAnimatedName(b.sourceName) ? 1 : 0;
  if (aAnim !== bAnim) return bAnim - aAnim;
  const aSkin = a.skinned ? 1 : 0;
  const bSkin = b.skinned ? 1 : 0;
  if (aSkin !== bSkin) return bSkin - aSkin;
  return a.sourceName.localeCompare(b.sourceName);
}

export function limitCandidatesByRealm(candidates, limit) {
  if (!limit || limit <= 0) return candidates;
  const byRealm = new Map();
  for (const candidate of candidates) {
    const list = byRealm.get(candidate.realmId) ?? [];
    list.push(candidate);
    byRealm.set(candidate.realmId, list);
  }
  return [...byRealm.values()].flatMap((list) => list.sort(candidateSort).slice(0, limit));
}

function uniqueOutputName(candidate, used) {
  if (candidate.outputName && !used.has(candidate.outputName)) {
    used.add(candidate.outputName);
    return candidate.outputName;
  }
  const seed = `${candidate.sourceRelative}|${candidate.size}`;
  const base = `${safeAssetName(candidate.sourceName)}_${hashShort(seed)}`;
  let name = `${base}.glb`;
  let i = 2;
  while (used.has(name)) {
    name = `${base}_${i}.glb`;
    i++;
  }
  used.add(name);
  return name;
}

async function removeGeneratedGlbs(dir) {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    entries
      .filter((e) => e.isFile() && /\.glb$/i.test(e.name))
      .map((e) => fs.rm(path.join(dir, e.name), { force: true })),
  );
}

async function copyIfChanged(source, dest) {
  if (DRY_RUN) return false;
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const sourceStat = await fs.stat(source);
  const destStat = await fs.stat(dest).catch(() => null);
  if (destStat && destStat.size === sourceStat.size) return false;
  await fs.copyFile(source, dest);
  return true;
}

async function copyArcadeVoidImages() {
  const sourceDir = path.join(REPO, 'arcade void realm assets');
  const outDir = path.join(OUT, 'arcadevoid');
  const files = await walkFiles(sourceDir);
  const images = [];
  for (const full of files) {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(full)) continue;
    const parsed = path.parse(full);
    const name = safeAssetName(parsed.name) + parsed.ext.toLowerCase();
    const dest = path.join(outDir, name);
    await copyIfChanged(full, dest);
    images.push({
      name: titleFromName(name),
      url: `/cr-realms/arcadevoid/${name}`,
      sourceName: path.basename(full),
      sourceRelative: path.relative(REPO, full).replace(/\\/g, '/'),
    });
  }
  return images;
}

async function buildRealm(realm, candidates) {
  const realmDir = path.join(OUT, realm.realmId);
  const forgedRealmDir = path.join(FORGED_DIR, realm.realmId);
  await removeGeneratedGlbs(realmDir);
  if (!DRY_RUN) await fs.mkdir(forgedRealmDir, { recursive: true });

  const chosen = candidates.sort(candidateSort).slice(0, MAX_PER_REALM ?? candidates.length);
  const used = new Set();
  const assets = [];
  let copiedPublic = 0;
  let copiedForged = 0;

  for (const c of chosen) {
    const fileName = uniqueOutputName(c, used);
    const publicDest = path.join(realmDir, fileName);
    const forgedDest = path.join(forgedRealmDir, fileName);
    if (await copyIfChanged(c.sourcePath, publicDest)) copiedPublic++;
    if (await copyIfChanged(c.sourcePath, forgedDest)) copiedForged++;
    const animationNames = c.animationNames ?? [];
    assets.push({
      name: titleFromName(fileName),
      url: `/cr-realms/${realm.realmId}/${fileName}`,
      size: c.size,
      animated: animationNames.length > 0 || looksAnimatedName(c.sourceName),
      source: c.source,
      sourceName: c.sourceName,
      sourceRelative: c.sourceRelative,
      ...(c.license ? { license: c.license } : {}),
      ...(c.author ? { author: c.author } : {}),
      ...(c.action ? { action: c.action } : {}),
      kind: classifyAssetKind(c.sourceName, c),
      meshCount: c.meshCount ?? 0,
      materialCount: c.materialCount ?? 0,
      textureCount: c.textureCount ?? 0,
      skinned: Boolean(c.skinned),
      animationNames,
      forgedKey: `${realm.realmId}/${fileName.replace(/\.glb$/i, '')}`,
      forgedUrl: `/forged/${encodeURIComponent(realm.realmId)}/${encodeURIComponent(fileName)}`,
      ...(c.inspectionError ? { inspectionError: c.inspectionError } : {}),
    });
  }

  const manifest = {
    realmId: realm.realmId,
    name: realm.name,
    generatedAt: new Date().toISOString(),
    forgedGroup: realm.realmId,
    assets,
  };
  if (realm.realmId === 'arcadevoid') {
    manifest.images = await copyArcadeVoidImages();
  }
  if (!DRY_RUN) {
    await fs.writeFile(
      path.join(realmDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  }
  return {
    realmId: realm.realmId,
    count: assets.length,
    animated: assets.filter((a) => a.animated).length,
    skinned: assets.filter((a) => a.skinned).length,
    bytes: assets.reduce((sum, a) => sum + a.size, 0),
    copiedPublic,
    copiedForged,
  };
}

async function inspectCandidates(candidates) {
  const out = [];
  for (const c of candidates) {
    const inspection = await inspectGlb(c.sourcePath);
    out.push({ ...c, ...inspection });
  }
  return out;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  let apiSummary = [];
  let candidates = [];

  if (!API_ONLY) {
    candidates.push(...(await gatherLocalCandidates()));
    candidates.push(...(await gatherPickturaCandidates()));
    candidates.push(...(await gatherExplicitCandidates()));
    candidates.push(...(await gatherApprovedAssetRoot(INFERNAL_ASSET_ROOT, 'infernal')));
    candidates.push(...(await gatherApprovedAssetRoot(CRYPTIC_ASSET_ROOT, 'crypticrealm')));
  }

  if (!SKIP_API) {
    const token = await readMeshyToken();
    if (token) {
      const api = await downloadMeshyCandidates(token);
      candidates.push(...api.candidates);
      apiSummary = api.summary;
    }
  }

  // Limit before GLB inspection. A mounted library can contain thousands of
  // files and inspection is intentionally expensive because it reads the
  // complete glTF graph and animation list.
  candidates = limitCandidatesByRealm(candidates, MAX_PER_REALM);
  candidates = await inspectCandidates(candidates);

  const byRealm = Object.fromEntries(REALMS.map((r) => [r.realmId, []]));
  for (const c of candidates) {
    const realmId = REALM_IDS.has(c.realmId) ? c.realmId : classifyRealmFromText(c.sourceName);
    byRealm[realmId].push(c);
  }

  const summary = [];
  for (const realm of REALMS) {
    summary.push(await buildRealm(realm, byRealm[realm.realmId] ?? []));
  }

  if (!DRY_RUN) {
    await fs.writeFile(
      path.join(OUT, 'index.json'),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          forgedDir: FORGED_DIR,
          realms: REALMS.map((r) => {
            const row = summary.find((s) => s.realmId === r.realmId);
            return {
              realmId: r.realmId,
              name: r.name,
              manifestUrl: `/cr-realms/${r.realmId}/manifest.json`,
              count: row?.count ?? 0,
              animated: row?.animated ?? 0,
              skinned: row?.skinned ?? 0,
            };
          }),
        },
        null,
        2,
      )}\n`,
    );
  }

  console.log('realm asset manifests:');
  for (const row of summary) {
    console.log(
      `  ${row.realmId.padEnd(13)} ${String(row.count).padStart(3)} assets ` +
        `${String(row.animated).padStart(3)} animated ${String(row.skinned).padStart(3)} skinned ` +
        `${(row.bytes / 1024 / 1024).toFixed(2)} MB`,
    );
  }
  if (apiSummary.length) {
    console.log('meshy api inventory:');
    for (const row of apiSummary) {
      console.log(`  ${row.endpoint.padEnd(12)} ${row.ok ? 'ok' : 'skip'} ${row.count} listed`);
    }
  }
  console.log(`forged store: ${FORGED_DIR}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
