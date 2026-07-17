import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = resolve(root, 'config/cryptic-recovery/features.json');
const checker = resolve(root, 'scripts/admin/check_recovery_manifest.mjs');

describe('permanent recovery manifest', () => {
  it('passes structural and discovery checks', () => {
    const output = execFileSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
    expect(output).toContain('PASS');
    expect(output).not.toContain('promotion blocked');
  });

  it('strict mode passes only with the committed discovery ledger', () => {
    const output = execFileSync(process.execPath, [checker, '--strict'], { cwd: root, encoding: 'utf8' });
    expect(output).toContain('PASS');
  });

  it('pins the production target, upstream anchors, and every feature contract', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      production: { host: string; container: number; repository: string };
      upstream: { release: { sha: string }; gauntletReference: { sha: string }; housingReference: { sha: string } };
      features: { id: string; enabled: boolean }[];
    };
    expect(manifest.production.host).toBe('192.168.0.6');
    expect(manifest.production.container).toBe(171);
    expect(manifest.production.repository).toBe('/opt/cryptic-realm');
    expect(manifest.upstream.release.sha).toBe('d8a871763d7ad1384d224a32b3c1ac0dd9cfc909');
    expect(manifest.upstream.gauntletReference.sha).toBe('196487c8688825d6831278191d3160e622142ec5');
    expect(manifest.upstream.housingReference.sha).toBe('505142a51f32550f0c6c0d917c4f22e61b51efe9');
    expect(manifest.features).toHaveLength(27);
    for (const id of ['F-016', 'F-018', 'F-019', 'F-020', 'F-021', 'F-022']) {
      expect(manifest.features.find((feature) => feature.id === id)?.enabled).toBe(false);
    }
  });
});
