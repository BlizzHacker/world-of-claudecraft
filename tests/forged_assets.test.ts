import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  defaultForgedDir,
  listForgedProps,
  listRealmProps,
  safeForgedPath,
} from '../server/forged_assets';

describe('forged asset catalog helpers', () => {
  it('uses the USB4-style forged store on Windows and Linux', () => {
    expect(defaultForgedDir('win32')).toBe(
      path.win32.join('T:\\', 'moveweight-assets', 'forged-glbs'),
    );
    expect(defaultForgedDir('linux')).toBe('/mnt/usb4/moveweight-assets/forged-glbs');
  });

  it('rejects unsafe forged refs', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forged-assets-'));
    try {
      expect(safeForgedPath('infernal/demon.glb', root)).toBe(
        path.join(root, 'infernal', 'demon.glb'),
      );
      expect(safeForgedPath('../secret.glb', root)).toBeNull();
      expect(safeForgedPath('infernal/../secret.glb', root)).toBeNull();
      expect(safeForgedPath('infernal/nested/demon.glb', root)).toBeNull();
      expect(safeForgedPath('not-a-model.txt', root)).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('lists loose and one-level realm GLBs for ArcForge', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forged-assets-'));
    try {
      await mkdir(path.join(root, 'infernal'));
      await mkdir(path.join(root, 'ignored', 'nested'), { recursive: true });
      await writeFile(path.join(root, 'loose_model.glb'), 'glTF');
      await writeFile(path.join(root, 'infernal', 'baal_idle.glb'), 'glTF');
      await writeFile(path.join(root, 'infernal', 'notes.txt'), 'skip');
      await writeFile(path.join(root, 'ignored', 'nested', 'too_deep.glb'), 'glTF');

      await expect(listForgedProps(root)).resolves.toEqual([
        {
          key: 'loose_model',
          name: 'loose model',
          url: '/forged/loose_model.glb',
          group: 'forged',
          placeKey: 'forged:loose_model',
        },
        {
          key: 'infernal/baal_idle',
          name: 'baal idle',
          url: '/forged/infernal/baal_idle.glb',
          group: 'infernal',
          placeKey: 'forged:infernal/baal_idle',
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

// The realm asset store: shipped, already served, and until now unreachable from
// the world builder because no prop key could name one.
describe('realm asset store catalog', () => {
  it('lists only the world-placeable buckets, keyed so the renderer can resolve them', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'cr-realms-'));
    try {
      for (const bucket of ['buildings', 'props', 'ships', 'melee']) {
        await mkdir(path.join(root, 'classic', bucket), { recursive: true });
      }
      await mkdir(path.join(root, 'review'), { recursive: true });
      await writeFile(
        path.join(root, 'classic', 'buildings', 'abandoned_manor_019a5964.glb'),
        'glTF',
      );
      await writeFile(path.join(root, 'classic', 'props', 'a_cocktail_01955245.glb'), 'glTF');
      await writeFile(path.join(root, 'classic', 'ships', 'alien_voyager_019ab785.glb'), 'glTF');
      // Held weapons are NOT scenery: they reach the world through a hand.
      await writeFile(path.join(root, 'classic', 'melee', 'crimson_blade_0194a884.glb'), 'glTF');
      await writeFile(path.join(root, 'classic', 'props', 'notes.txt'), 'skip');
      await writeFile(path.join(root, 'review', 'data_classic.json'), '[]');

      const rows = await listRealmProps(root);
      expect(rows.map((r) => r.placeKey)).toEqual([
        'realm:classic/buildings/abandoned_manor_019a5964',
        'realm:classic/props/a_cocktail_01955245',
        'realm:classic/ships/alien_voyager_019ab785',
      ]);
      expect(rows.map((r) => r.name)).toEqual([
        'Building \u00b7 Abandoned Manor',
        'Prop \u00b7 A Cocktail',
        'Ship \u00b7 Alien Voyager',
      ]);
      expect(rows[0].group).toBe('classic');
      expect(rows[0].url).toBe('/cr-realms/classic/buildings/abandoned_manor_019a5964.glb');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('is empty rather than throwing when the store is absent', async () => {
    await expect(listRealmProps('/nonexistent-cr-realms-store')).resolves.toEqual([]);
  });
});
