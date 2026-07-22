import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultForgedDir, listForgedProps, safeForgedPath } from '../server/forged_assets';

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
        },
        {
          key: 'infernal/baal_idle',
          name: 'baal idle',
          url: '/forged/infernal/baal_idle.glb',
          group: 'infernal',
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
