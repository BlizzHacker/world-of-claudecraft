import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('Tauri Microsoft Store packaging config', () => {
  it('keeps the Store build on an offline NSIS installer', () => {
    const config = readJson('src-tauri/tauri.microsoftstore.conf.json');
    expect(config.build).toEqual({
      beforeBuildCommand: '',
      frontendDist: './shell-stub',
    });
    expect(config.bundle.targets).toEqual(['nsis']);
    expect(config.bundle.windows.webviewInstallMode).toEqual({ type: 'offlineInstaller' });
  });

  it('sets a publisher distinct from the Cryptic Realm product name', () => {
    const config = readJson('src-tauri/tauri.conf.json');
    expect(config.productName).toBe('Cryptic Realm');
    expect(typeof config.bundle.publisher).toBe('string');
    expect(config.bundle.publisher.length).toBeGreaterThan(0);
    expect(config.bundle.publisher).not.toBe(config.productName);
  });

  it('keeps the Tauri shell on the package release line', () => {
    const config = readJson('src-tauri/tauri.conf.json');
    const pkg = readJson('package.json');
    expect(pkg.version.startsWith(config.version)).toBe(true);
    expect(readFileSync('src-tauri/Cargo.toml', 'utf8')).toContain(`version = "${config.version}"`);
  });

  it('exposes npm scripts for local Windows and LXC cross builds', () => {
    const pkg = readJson('package.json');
    expect(pkg.scripts['tauri:build:store']).toContain('src-tauri/tauri.microsoftstore.conf.json');
    expect(pkg.scripts['tauri:build:store:win-x64']).toContain('cargo-xwin');
    expect(pkg.scripts['tauri:build:store:win-x64']).toContain('x86_64-pc-windows-msvc');
  });

  it('builds a Store-identity MSIX for the Partner Center package target', () => {
    const pkg = readJson('package.json');
    const script = readFileSync('scripts/build_tauri_msix.mjs', 'utf8');
    expect(pkg.scripts['tauri:build:msix']).toBe('node scripts/build_tauri_msix.mjs');
    expect(script).toContain("name: 'MOVEWEIGHT.CrypticRealm'");
    expect(script).toContain("publisher: 'CN=6375D74B-5E4F-45B4-B246-B29507C1332A'");
    expect(script).toContain("Name=\"Windows.Desktop\"");
  });
});
