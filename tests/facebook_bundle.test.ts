import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  evaluateBundleSize,
  FBINSTANT_SDK_URL,
  MAX_BUNDLE_BYTES,
  RECOMMENDED_INITIAL_BUNDLE_BYTES,
  validateBundleEntryNames,
  validateEntryHtml,
  validateFbappConfig,
} from '../scripts/facebook/bundle_rules.mjs';
import { crc32, createStoreZip } from '../scripts/facebook/zip_store.mjs';

const repoRoot = path.join(__dirname, '..');
const facebookDir = path.join(repoRoot, 'facebook');
const buildScript = path.join(repoRoot, 'scripts', 'build_facebook_bundle.mjs');
const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('fbapp-config validation', () => {
  it('accepts the shipped facebook/fbapp-config.json', () => {
    const config = JSON.parse(readFileSync(path.join(facebookDir, 'fbapp-config.json'), 'utf8'));
    expect(validateFbappConfig(config)).toEqual([]);
    // The shipped defaults the task and the game demand: landscape, rich gameplay.
    expect(config.instant_games.orientation).toBe('LANDSCAPE');
    expect(config.instant_games.platform_version).toBe('RICH_GAMEPLAY');
  });

  it('rejects a missing instant_games section', () => {
    expect(validateFbappConfig({})).toEqual([
      'fbapp-config.json must contain an "instant_games" object',
    ]);
    expect(validateFbappConfig(null)).toEqual(['fbapp-config.json must be a JSON object']);
  });

  it('rejects bad field values and unknown keys', () => {
    const errors = validateFbappConfig({
      instant_games: {
        platform_version: 'CLASSIC',
        orientation: 'SIDEWAYS',
        navigation_menu_version: 'NAV_NONE',
        orientatoin: 'LANDSCAPE',
      },
    });
    expect(errors).toContain('instant_games.platform_version must be "RICH_GAMEPLAY"');
    expect(errors.some((e: string) => e.includes('instant_games.orientation'))).toBe(true);
    expect(errors.some((e: string) => e.includes('navigation_menu_version'))).toBe(true);
    expect(errors).toContain('instant_games has an unknown key: orientatoin');
  });
});

describe('entry html validation', () => {
  it('accepts the shipped facebook/index.html', () => {
    const html = readFileSync(path.join(facebookDir, 'index.html'), 'utf8');
    expect(validateEntryHtml(html)).toEqual([]);
  });

  it('demands the SDK include and the full lifecycle', () => {
    const errors = validateEntryHtml('<html><body>hello</body></html>');
    expect(errors).toContain(`index.html must load the FBInstant SDK from ${FBINSTANT_SDK_URL}`);
    expect(errors).toContain('index.html must call FBInstant.initializeAsync');
    expect(errors).toContain('index.html must call FBInstant.setLoadingProgress');
    expect(errors).toContain('index.html must call FBInstant.startGameAsync');
  });
});

describe('bundle entry names', () => {
  it('requires index.html and fbapp-config.json at the zip root', () => {
    expect(validateBundleEntryNames(['index.html', 'fbapp-config.json'])).toEqual([]);
    expect(validateBundleEntryNames(['game/index.html', 'fbapp-config.json'])).toEqual([
      'bundle must contain index.html at the zip root',
    ]);
  });

  it('rejects unsafe entry names', () => {
    const errors = validateBundleEntryNames([
      'index.html',
      'fbapp-config.json',
      'assets\\logo.png',
      '/abs.png',
      '../escape.png',
    ]);
    expect(errors.some((e: string) => e.includes('backslashes'))).toBe(true);
    expect(errors.some((e: string) => e.includes('absolute'))).toBe(true);
    expect(errors.some((e: string) => e.includes('escapes the root'))).toBe(true);
  });
});

describe('bundle size verdicts', () => {
  it('blocks past the platform maximum and warns past the recommended size', () => {
    expect(evaluateBundleSize(1024)).toEqual({ errors: [], warnings: [] });
    const warned = evaluateBundleSize(RECOMMENDED_INITIAL_BUNDLE_BYTES + 1);
    expect(warned.errors).toEqual([]);
    expect(warned.warnings.length).toBe(1);
    const blocked = evaluateBundleSize(MAX_BUNDLE_BYTES + 1);
    expect(blocked.errors.length).toBe(1);
  });
});

describe('store zip writer', () => {
  const entries = [
    { name: 'index.html', data: Buffer.from('<html>hi</html>', 'utf8') },
    { name: 'fbapp-config.json', data: Buffer.from('{}', 'utf8') },
  ];

  it('emits a structurally valid, deterministic zip', () => {
    const zip = createStoreZip(entries);
    const again = createStoreZip(entries);
    expect(zip.equals(again)).toBe(true);
    // Local file header magic at offset 0, end-of-central-directory at the tail.
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
    expect(zip.readUInt16LE(zip.length - 22 + 10)).toBe(entries.length);
    // Stored CRC in the first local header matches an independent computation.
    expect(zip.readUInt32LE(14)).toBe(crc32(entries[0].data));
    // Entry names and raw bytes land verbatim (store method, no compression).
    expect(zip.includes(Buffer.from('index.html', 'ascii'))).toBe(true);
    expect(zip.includes(entries[0].data)).toBe(true);
  });

  it('rejects unsafe or duplicate entries', () => {
    expect(() => createStoreZip([])).toThrow('zip needs entries');
    expect(() => createStoreZip([{ name: '../up.txt', data: Buffer.alloc(1) }])).toThrow(
      'escapes the root',
    );
    expect(() => createStoreZip([entries[0], entries[0]])).toThrow('duplicate zip entry');
  });
});

describe('build_facebook_bundle.mjs', () => {
  it('parses cleanly under node --check', () => {
    execFileSync(process.execPath, ['--check', buildScript], { encoding: 'utf8' });
  });

  it('builds a passing bundle from the real facebook/ directory', () => {
    const outDir = mkdtempSync(path.join(tmpdir(), 'cr-fb-bundle-'));
    tempDirs.push(outDir);
    const stdout = execFileSync(process.execPath, [buildScript, '--out-dir', outDir], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(stdout).toContain('[facebook-bundle] PASS');
    const zips = readdirSync(outDir).filter((name) => name.endsWith('.zip'));
    expect(zips.length).toBe(1);
    expect(zips[0]).toMatch(/^cryptic-realm-instant-games-v.+\.zip$/);
    const zip = readFileSync(path.join(outDir, zips[0]));
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(existsSync(path.join(repoRoot, 'facebook', 'index.html'))).toBe(true);
    // The shell bundle must stay far below the recommended initial size.
    expect(zip.length).toBeLessThan(RECOMMENDED_INITIAL_BUNDLE_BYTES);
  });
});
