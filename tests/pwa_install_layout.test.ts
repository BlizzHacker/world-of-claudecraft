import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainTs = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const pwaInstallTs = readFileSync(
  new URL('../src/ui/cryptic/pwa_install.ts', import.meta.url),
  'utf8',
);
const pwaInstallCss = readFileSync(
  new URL('../src/ui/cryptic/pwa_install.css', import.meta.url),
  'utf8',
);

describe('PWA install prompt layout', () => {
  it('loads a narrow-viewport override for the install banner', () => {
    expect(mainTs).toContain("import { mountPwaInstall } from './ui/cryptic/pwa_install';");
    expect(pwaInstallTs).toContain("import './pwa_install.css';");
    expect(pwaInstallCss).toContain('width: min(560px, calc(100vw - 32px));');
    expect(pwaInstallCss).toContain('flex: 1 1 260px;');
    expect(pwaInstallCss).toContain('@media (max-width: 520px) {');
    expect(pwaInstallCss).toContain('right: max(12px, env(safe-area-inset-right));');
    expect(pwaInstallCss).toContain('left: max(12px, env(safe-area-inset-left));');
    expect(pwaInstallCss).toContain('transform: none;');
    expect(pwaInstallCss).toContain('width: auto;');
    expect(pwaInstallCss).toContain('@media (max-width: 360px) {');
  });
});
