// Unified read-only asset library for both ArcForge editors. Mounted operator
// roots, generated realm manifests, and the forged store share one stable id
// and byte-serving surface without copying multi-gigabyte source libraries into
// the repository.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import type http from 'node:http';
import path from 'node:path';
import { configuredCrRealmsDir, configuredForgedDir } from './forged_assets';

const ROOT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const ASSET_ID_RE = /^library\/([a-z0-9][a-z0-9_-]{0,31})\/([a-f0-9]{24})$/;
const MAX_DISCOVERED_ASSETS = 25_000;
const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
const MAX_QUERY_LENGTH = 80;
const MAX_PAGE_SIZE = 500;
// A raw PICKTURA scan touches thousands of files over the USB/NAS mount. Keep
// that work out of the search hot path; explicit authoring refresh will
// invalidate this cache when new assets are published.
const CACHE_MS = 5 * 60_000;
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', 'quarantine']);

export interface AssetLibraryRoot {
  id: string;
  path: string;
  group?: string;
  realmId?: string;
}

export interface AssetLibraryItem {
  assetId: string;
  name: string;
  url: string;
  group: string;
  realmId: string;
  source: 'library' | 'realm' | 'forged';
  kind: 'character' | 'prop' | 'vehicle';
  byteSize: number;
  animated: boolean;
  skinned: boolean;
}

interface IndexedAsset extends AssetLibraryItem {
  filePath: string;
}

export interface AssetLibraryListOptions {
  page?: number;
  limit?: number;
  q?: string;
  group?: string;
  realmId?: string;
}

export interface AssetLibraryListResult {
  assets: AssetLibraryItem[];
  page: number;
  limit: number;
  total: number;
  facets: {
    groups: Record<string, number>;
    realms: Record<string, number>;
    sources: Record<string, number>;
  };
}

export function parseAssetLibraryRoots(raw = process.env.ASSET_LIBRARY_ROOTS_JSON): AssetLibraryRoot[] {
  if (!raw?.trim()) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const roots: AssetLibraryRoot[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim().toLowerCase() : '';
    const rootPath = typeof row.path === 'string' ? row.path.trim() : '';
    if (!ROOT_ID_RE.test(id) || !rootPath || seen.has(id)) continue;
    seen.add(id);
    roots.push({
      id,
      path: path.resolve(rootPath),
      ...(typeof row.group === 'string' && row.group.trim() ? { group: row.group.trim() } : {}),
      ...(typeof row.realmId === 'string' && row.realmId.trim()
        ? { realmId: row.realmId.trim().toLowerCase() }
        : {}),
    });
  }
  return roots;
}

type Exists = (candidate: string) => boolean;

/**
 * Local operator defaults. These are intentionally limited to the asset roots
 * Wade approved; especially, the ArcForge/Koolo quarantine is never indexed.
 * Linux production already gets the shared cr-realms and forged stores via
 * configuredCrRealmsDir/configuredForgedDir, so only optional extra mounts live
 * here.
 */
export function defaultAssetLibraryRoots(
  platform: NodeJS.Platform = process.platform,
  exists: Exists = fs.existsSync,
): AssetLibraryRoot[] {
  const candidates: AssetLibraryRoot[] =
    platform === 'win32'
      ? [
          {
            id: 'piktura',
            path: path.win32.resolve('T:\\meshy\\PICKTURA'),
            group: 'PICKTURA',
            realmId: 'unassigned',
          },
          {
            id: 'classic-source',
            path: path.win32.resolve('C:\\MoveWeight\\cryptic-realm\\classic realm assets'),
            group: 'Classic Realm',
            realmId: 'classic',
          },
          {
            id: 'cryptic-source',
            path: path.win32.resolve('C:\\MoveWeight\\cryptic-realm\\cryptic realm assets'),
            group: 'Cryptic Realm',
            realmId: 'crypticrealm',
          },
          {
            id: 'arcadevoid-source',
            path: path.win32.resolve('C:\\MoveWeight\\cryptic-realm\\arcade void realm assets'),
            group: 'Arcane Void',
            realmId: 'arcadevoid',
          },
          {
            id: 'claudecraft-source',
            path: path.win32.resolve('C:\\MoveWeight\\cryptic-realm\\claudcraft realm assets'),
            group: 'ClaudeCraft',
            realmId: 'claudecraft',
          },
          {
            id: 'infernal-source',
            path: path.win32.resolve('C:\\MoveWeight\\cryptic-realm\\infernal realm assets'),
            group: 'Infernal Realm',
            realmId: 'infernal',
          },
          {
            id: 'd2-koolo',
            path: path.win32.resolve('T:\\arcforge-staging\\aegis-v2'),
            group: 'D2-Koolo',
            realmId: 'classic',
          },
        ]
      : [
          {
            id: 'piktura',
            path: '/mnt/usb4/meshy/PICKTURA',
            group: 'PICKTURA',
            realmId: 'unassigned',
          },
          {
            id: 'd2-koolo',
            path: '/mnt/usb4/arcforge-staging/aegis-v2',
            group: 'D2-Koolo',
            realmId: 'classic',
          },
        ];
  return candidates.filter((root) => exists(root.path));
}

export function configuredAssetLibraryRoots(
  raw = process.env.ASSET_LIBRARY_ROOTS_JSON,
  platform: NodeJS.Platform = process.platform,
  exists: Exists = fs.existsSync,
): AssetLibraryRoot[] {
  // An explicitly supplied JSON array is authoritative, including `[]`.
  return raw?.trim() ? parseAssetLibraryRoots(raw) : defaultAssetLibraryRoots(platform, exists);
}

function stableAssetId(rootId: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  const hash = createHash('sha256').update(`${rootId}\0${normalized}`).digest('hex').slice(0, 24);
  return `library/${rootId}/${hash}`;
}

function assetUrl(assetId: string): string {
  return `/asset-library/${assetId.slice('library/'.length)}.glb`;
}

function prettyName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName))
    .replace(/^[a-f0-9-]{20,}__+/i, '')
    .replace(/^[a-z]+__/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ''));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

async function readManifestCsv(filePath: string): Promise<Record<string, string>[] | null> {
  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat?.isFile()) return null;
  if (stat.size > MAX_MANIFEST_BYTES) throw new Error(`asset manifest too large: ${filePath}`);
  const rows = parseCsv(await fsp.readFile(filePath, 'utf8'));
  const header = rows.shift();
  if (!header?.length) return [];
  return rows.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])),
  );
}

function validManifestGlbName(value: string): boolean {
  return (
    value.length > 4 &&
    value.length <= 240 &&
    value.toLowerCase().endsWith('.glb') &&
    path.basename(value) === value &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('\0')
  );
}

async function discoverPikturaIndex(root: AssetLibraryRoot): Promise<IndexedAsset[] | null> {
  const manifestDir = path.join(root.path, '_manifest');
  const baseRows = await readManifestCsv(path.join(manifestDir, 'manifest.glb.csv'));
  if (baseRows === null) return null;
  const animatedRows =
    (await readManifestCsv(path.join(manifestDir, 'manifest.animated.csv'))) ?? [];
  const assets: IndexedAsset[] = [];
  const add = (row: Record<string, string>, folder: 'glb' | 'animated', animated: boolean) => {
    const fileName = row.filename ?? '';
    if (!validManifestGlbName(fileName) || /_armature\.glb$/i.test(fileName)) return;
    const relative = `${folder}/${fileName}`;
    const id = stableAssetId(root.id, relative);
    const name = prettyName(fileName);
    const kind = inferKind(name, relative);
    const parsedSize = Number(row.bytes);
    assets.push({
      assetId: id,
      name,
      url: assetUrl(id),
      group: root.group ?? root.id,
      realmId: root.realmId ?? 'unassigned',
      source: 'library',
      kind,
      byteSize: Number.isFinite(parsedSize) ? Math.max(0, Math.floor(parsedSize)) : 0,
      animated,
      skinned: animated && kind === 'character',
      filePath: path.join(root.path, folder, fileName),
    });
  };
  for (const row of baseRows) add(row, 'glb', false);
  for (const row of animatedRows) add(row, 'animated', true);
  return assets;
}

function inferKind(name: string, relativePath = ''): AssetLibraryItem['kind'] {
  const text = `${relativePath} ${name}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  if (/\b(ship|spaceship|cruiser|tank|kart|vehicle|mount)\b/.test(text)) return 'vehicle';
  if (
    /\b(animated|characters?|chars?)\b/.test(text) ||
    /\b(human|humanoid|hero|warrior|footman|knight|paladin|mage|witch|wizard|warlock|monk|shaman|druid|rogue|assassin|archer|huntress|demon|orc|goblin|elf|dwarf|herald|behemoth|specter|spectre|monster|npc|soldier|ranger)\b/.test(
      text,
    )
  ) {
    return 'character';
  }
  return 'prop';
}

async function walkGlbs(rootPath: string): Promise<Array<{ path: string; relative: string; size: number }>> {
  const root = path.resolve(rootPath);
  const found: Array<{ path: string; relative: string; size: number }> = [];
  const pending = [root];
  while (pending.length > 0 && found.length < MAX_DISCOVERED_ASSETS) {
    const dir = pending.pop()!;
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (found.length >= MAX_DISCOVERED_ASSETS) break;
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name.toLowerCase())) continue;
        pending.push(full);
        continue;
      }
      if (!entry.isFile() || !/\.glb$/i.test(entry.name) || /_armature\.glb$/i.test(entry.name)) {
        continue;
      }
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat?.isFile()) continue;
      found.push({ path: full, relative: path.relative(root, full), size: stat.size });
    }
  }
  return found;
}

export async function discoverAssetRoot(root: AssetLibraryRoot): Promise<IndexedAsset[]> {
  const indexed = await discoverPikturaIndex(root);
  if (indexed !== null) return indexed;
  const rows = await walkGlbs(root.path);
  return rows.map((row) => {
    const id = stableAssetId(root.id, row.relative);
    const name = prettyName(row.relative);
    const kind = inferKind(name, row.relative);
    return {
      assetId: id,
      name,
      url: assetUrl(id),
      group: root.group ?? root.id,
      realmId: root.realmId ?? 'unassigned',
      source: 'library',
      kind,
      byteSize: row.size,
      animated: /(^|[\\/])animated([\\/]|$)/i.test(row.relative),
      skinned: kind === 'character' && /(^|[\\/])animated([\\/]|$)/i.test(row.relative),
      filePath: row.path,
    };
  });
}

async function discoverRealmAssets(realmsDir: string): Promise<IndexedAsset[]> {
  const root = path.resolve(realmsDir);
  const dirs = await fsp.readdir(root, { withFileTypes: true }).catch(() => []);
  const rows: IndexedAsset[] = [];
  for (const dir of dirs) {
    if (!dir.isDirectory() || !ROOT_ID_RE.test(dir.name)) continue;
    const manifestPath = path.join(root, dir.name, 'manifest.json');
    const stat = await fsp.stat(manifestPath).catch(() => null);
    if (!stat?.isFile() || stat.size > MAX_MANIFEST_BYTES) continue;
    let manifest: any;
    try {
      manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
    } catch {
      continue;
    }
    if (!Array.isArray(manifest?.assets)) continue;
    for (const asset of manifest.assets) {
      if (!asset || typeof asset !== 'object' || typeof asset.url !== 'string') continue;
      const prefix = `/cr-realms/${dir.name}/`;
      if (!asset.url.startsWith(prefix) || !asset.url.toLowerCase().endsWith('.glb')) continue;
      const fileName = decodeURIComponent(asset.url.slice(prefix.length));
      if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) continue;
      const filePath = path.join(root, dir.name, fileName);
      const idRoot = `realm-${dir.name}`;
      const id = stableAssetId(idRoot, fileName);
      rows.push({
        assetId: id,
        name: typeof asset.name === 'string' && asset.name.trim() ? asset.name.trim() : prettyName(fileName),
        url: assetUrl(id),
        group: dir.name,
        realmId: dir.name,
        source: 'realm',
        kind:
          asset.kind === 'character' || asset.kind === 'vehicle' || asset.kind === 'prop'
            ? asset.kind
            : inferKind(fileName),
        byteSize: Number.isFinite(asset.size) ? Math.max(0, Number(asset.size)) : 0,
        animated: asset.animated === true,
        skinned: asset.skinned === true,
        filePath,
      });
    }
  }
  return rows;
}

async function discoverForgedAssets(forgedDir: string): Promise<IndexedAsset[]> {
  const root: AssetLibraryRoot = { id: 'forged', path: forgedDir, group: 'forged' };
  const rows = await walkGlbs(root.path);
  return rows.map((row) => {
    const top = row.relative.replace(/\\/g, '/').split('/');
    const group = top.length > 1 && ROOT_ID_RE.test(top[0]) ? top[0] : 'forged';
    const id = stableAssetId(root.id, row.relative);
    return {
      assetId: id,
      name: prettyName(row.relative),
      url: assetUrl(id),
      group,
      realmId: group === 'forged' ? 'unassigned' : group,
      source: 'forged',
      kind: inferKind(row.relative),
      byteSize: row.size,
      animated: false,
      skinned: false,
      filePath: row.path,
    };
  });
}

export class AssetLibrary {
  private snapshot: { at: number; assets: IndexedAsset[]; byId: Map<string, IndexedAsset> } | null =
    null;
  private loading: Promise<{ at: number; assets: IndexedAsset[]; byId: Map<string, IndexedAsset> }> | null =
    null;

  constructor(
    private readonly config: {
      roots: AssetLibraryRoot[];
      realmsDir: string;
      forgedDir: string;
      cacheMs?: number;
    },
  ) {}

  invalidate(): void {
    this.snapshot = null;
  }

  private async load(): Promise<{ at: number; assets: IndexedAsset[]; byId: Map<string, IndexedAsset> }> {
    const cacheMs = this.config.cacheMs ?? CACHE_MS;
    if (this.snapshot && Date.now() - this.snapshot.at < cacheMs) return this.snapshot;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const batches = await Promise.all([
        ...this.config.roots.map((root) => discoverAssetRoot(root)),
        discoverRealmAssets(this.config.realmsDir),
        discoverForgedAssets(this.config.forgedDir),
      ]);
      const byId = new Map<string, IndexedAsset>();
      for (const asset of batches.flat()) byId.set(asset.assetId, asset);
      const assets = [...byId.values()].sort(
        (a, b) => a.name.localeCompare(b.name) || a.assetId.localeCompare(b.assetId),
      );
      return { at: Date.now(), assets, byId };
    })();
    try {
      this.snapshot = await this.loading;
      return this.snapshot;
    } finally {
      this.loading = null;
    }
  }

  async list(options: AssetLibraryListOptions): Promise<AssetLibraryListResult> {
    const snapshot = await this.load();
    const q = (options.q ?? '').trim().toLowerCase().slice(0, MAX_QUERY_LENGTH);
    const group = (options.group ?? '').trim().toLowerCase();
    const realmId = (options.realmId ?? '').trim().toLowerCase();
    const requestedPage = Number(options.page);
    const requestedLimit = Number(options.limit);
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(requestedLimit)))
      : 220;
    const facets = {
      groups: {} as Record<string, number>,
      realms: {} as Record<string, number>,
      sources: {} as Record<string, number>,
    };
    for (const asset of snapshot.assets) {
      facets.groups[asset.group] = (facets.groups[asset.group] ?? 0) + 1;
      facets.realms[asset.realmId] = (facets.realms[asset.realmId] ?? 0) + 1;
      facets.sources[asset.source] = (facets.sources[asset.source] ?? 0) + 1;
    }
    const filtered = snapshot.assets.filter((asset) => {
      if (group && asset.group.toLowerCase() !== group) return false;
      if (realmId && asset.realmId.toLowerCase() !== realmId) return false;
      if (!q) return true;
      return `${asset.name} ${asset.assetId} ${asset.group} ${asset.realmId}`.toLowerCase().includes(q);
    });
    const start = (page - 1) * limit;
    return {
      assets: filtered.slice(start, start + limit).map(({ filePath: _filePath, ...asset }) => asset),
      page,
      limit,
      total: filtered.length,
      facets,
    };
  }

  async resolve(assetId: string): Promise<string | null> {
    if (!ASSET_ID_RE.test(assetId)) return null;
    return (await this.load()).byId.get(assetId)?.filePath ?? null;
  }
}

export const assetLibrary = new AssetLibrary({
  roots: configuredAssetLibraryRoots(),
  realmsDir: configuredCrRealmsDir(),
  forgedDir: configuredForgedDir(),
});

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const encoded = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(encoded)),
    'cache-control': 'no-store',
  });
  res.end(encoded);
}

export async function handleAssetLibraryCatalog(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const parsed = new URL(req.url ?? '/', 'http://localhost');
  if (parsed.pathname !== '/api/asset-library') return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' });
    res.end();
    return true;
  }
  const result = await assetLibrary.list({
    page: Number(parsed.searchParams.get('page') ?? 1),
    limit: Number(parsed.searchParams.get('limit') ?? 220),
    q: parsed.searchParams.get('q') ?? '',
    group: parsed.searchParams.get('group') ?? '',
    realmId: parsed.searchParams.get('realm') ?? '',
  });
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'cache-control': 'no-store' });
    res.end();
    return true;
  }
  sendJson(res, 200, result);
  return true;
}

export async function handleAssetLibraryStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  let pathname: string;
  try {
    pathname = decodeURIComponent((req.url ?? '').split('?')[0]);
  } catch {
    res.writeHead(404);
    res.end('not found');
    return true;
  }
  if (!pathname.startsWith('/asset-library/')) return false;
  const match = /^\/asset-library\/([a-z0-9][a-z0-9_-]{0,31})\/([a-f0-9]{24})\.glb$/.exec(
    pathname,
  );
  if (!match || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(match ? 405 : 404, match ? { allow: 'GET, HEAD' } : undefined);
    res.end();
    return true;
  }
  const filePath = await assetLibrary.resolve(`library/${match[1]}/${match[2]}`);
  const stat = filePath ? await fsp.lstat(filePath).catch(() => null) : null;
  if (!filePath || !stat?.isFile() || stat.isSymbolicLink()) {
    res.writeHead(404);
    res.end('not found');
    return true;
  }
  res.writeHead(200, {
    'content-type': 'model/gltf-binary',
    'content-length': String(stat.size),
    // Library ids identify a stable source path, not a content hash. Revalidate
    // promptly so an ArcForge replacement does not stay stale in the browser.
    'cache-control': 'public, max-age=60, must-revalidate',
  });
  if (req.method === 'HEAD') res.end();
  else {
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  }
  return true;
}
