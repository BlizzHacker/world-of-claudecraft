import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AssetLibrary,
  configuredAssetLibraryRoots,
  defaultAssetLibraryRoots,
  discoverAssetRoot,
  parseAssetLibraryRoots,
} from '../server/asset_library';

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'cr-library-'));
  cleanup.push(dir);
  return dir;
}

describe('ArcForge asset library', () => {
  it('parses only explicit, valid read-only roots', () => {
    const roots = parseAssetLibraryRoots(
      JSON.stringify([
        { id: 'piktura', path: 'T:\\meshy\\PICKTURA', group: 'PICKTURA' },
        { id: '../escape', path: 'C:\\bad' },
        { id: 'missing-path' },
      ]),
    );

    expect(roots).toEqual([
      { id: 'piktura', path: path.resolve('T:\\meshy\\PICKTURA'), group: 'PICKTURA' },
    ]);
    expect(parseAssetLibraryRoots('not json')).toEqual([]);
  });

  it('discovers the approved local libraries by default without exposing quarantine', () => {
    const existing = new Set([
      path.win32.resolve('T:\\meshy\\PICKTURA'),
      path.win32.resolve('T:\\arcforge-staging\\aegis-v2'),
      path.win32.resolve('C:\\MoveWeight\\cryptic-realm\\classic realm assets'),
    ]);
    const roots = defaultAssetLibraryRoots('win32', (candidate) =>
      existing.has(path.win32.resolve(candidate)),
    );

    expect(roots.map((root) => root.id)).toEqual(['piktura', 'classic-source', 'd2-koolo']);
    expect(roots.every((root) => !/quarantine/i.test(root.path))).toBe(true);
    expect(configuredAssetLibraryRoots('[]', 'win32', () => true)).toEqual([]);
  });

  it('indexes visual GLBs but excludes armature-only donors and unrelated files', async () => {
    const root = await tempDir();
    await mkdir(path.join(root, 'animated'));
    await writeFile(path.join(root, 'animated', 'Human Warrior Walking.glb'), 'glTF-body');
    await writeFile(path.join(root, 'animated', 'Human Warrior Walking_armature.glb'), 'glTF-donor');
    await writeFile(path.join(root, 'animated', 'source.fbx'), 'fbx');

    const rows = await discoverAssetRoot({
      id: 'piktura',
      path: root,
      group: 'PICKTURA',
      realmId: 'unassigned',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: 'library',
      group: 'PICKTURA',
      realmId: 'unassigned',
      name: 'Human Warrior Walking',
      kind: 'character',
    });
    expect(rows[0].assetId).toMatch(/^library\/piktura\/[a-f0-9]{24}$/);
    expect(rows[0].url).toBe(`/asset-library/${rows[0].assetId.slice('library/'.length)}.glb`);
  });

  it('uses the PICKTURA CSV index instead of recursively walking the large source tree', async () => {
    const root = await tempDir();
    await mkdir(path.join(root, '_manifest'));
    await mkdir(path.join(root, 'glb'));
    await mkdir(path.join(root, 'animated'));
    await mkdir(path.join(root, 'quarantine'));
    const baseName = '019f0000-0000-7000-8000-000000000001__Human_Paladin.glb';
    const walkName =
      '019f0000-0000-7000-8000-000000000001__Human_Paladin__Walking.glb';
    await writeFile(path.join(root, 'glb', baseName), 'base');
    await writeFile(path.join(root, 'animated', walkName), 'walking');
    await writeFile(path.join(root, 'unindexed.glb'), 'not-in-manifest');
    await writeFile(path.join(root, 'quarantine', 'must-never-appear.glb'), 'bad');
    await writeFile(
      path.join(root, '_manifest', 'manifest.glb.csv'),
      [
        'id,filename,format,license,author,bytes,sha256,source_url',
        `019f0000-0000-7000-8000-000000000001,${baseName},glb,cc0,PICKTURA,4,hash,resolved`,
      ].join('\n'),
    );
    await writeFile(
      path.join(root, '_manifest', 'manifest.animated.csv'),
      [
        'resultId,filename,kind,action,license,author,bytes',
        `019f0000-0000-7000-8000-000000000001,${walkName},animated,Walking,cc0,PICKTURA,7`,
        '019f0000-0000-7000-8000-000000000001,ignored_armature.glb,animated,Walking,cc0,PICKTURA,7',
      ].join('\n'),
    );

    const rows = await discoverAssetRoot({ id: 'piktura', path: root, group: 'PICKTURA' });

    expect(rows.map((row) => row.name)).toEqual(['Human Paladin', 'Human Paladin Walking']);
    expect(rows.map((row) => row.animated)).toEqual([false, true]);
    expect(rows.every((row) => !row.filePath.includes('quarantine'))).toBe(true);
  });

  it('combines mounted roots, generated realm manifests, and forged GLBs with facets and search', async () => {
    const root = await tempDir();
    const realms = await tempDir();
    const forged = await tempDir();
    await writeFile(path.join(root, 'Radiant Human Paladin.glb'), 'glTF-human');
    await mkdir(path.join(realms, 'infernal'), { recursive: true });
    await writeFile(
      path.join(realms, 'infernal', 'manifest.json'),
      JSON.stringify({
        realmId: 'infernal',
        assets: [
          {
            name: 'Dark Paladin Commander',
            url: '/cr-realms/infernal/dark_paladin_commander.glb',
            kind: 'character',
            animated: true,
            skinned: true,
            size: 100,
          },
        ],
      }),
    );
    await writeFile(path.join(forged, 'Bone_Herald.glb'), 'glTF-bone');

    const library = new AssetLibrary({
      roots: [{ id: 'piktura', path: root, group: 'PICKTURA', realmId: 'unassigned' }],
      realmsDir: realms,
      forgedDir: forged,
    });
    const all = await library.list({ page: 1, limit: 50 });
    const paladins = await library.list({ page: 1, limit: 50, q: 'paladin' });
    const normalized = await library.list({ page: Number.NaN, limit: Number.NaN });

    expect(all.total).toBe(3);
    expect(all.facets.groups).toMatchObject({ PICKTURA: 1, infernal: 1, forged: 1 });
    expect(paladins.total).toBe(2);
    expect(paladins.assets.map((asset) => asset.name)).toEqual([
      'Dark Paladin Commander',
      'Radiant Human Paladin',
    ]);
    expect(normalized).toMatchObject({ page: 1, limit: 220 });
    for (const asset of all.assets) expect(await library.resolve(asset.assetId)).not.toBeNull();
  });
});
