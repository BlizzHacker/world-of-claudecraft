import { describe, expect, it } from 'vitest';
import {
  buildManifest,
  isPrivatePath,
  sanitizeText,
  secretMatches,
} from '../scripts/sanitize_upstream_patch.mjs';

describe('upstream patch sanitizer', () => {
  it('rejects Cryptic-only and credential-bearing paths', () => {
    expect(isPrivatePath('src/sim/realms/content/exchange.ts')).toBe(true);
    expect(isPrivatePath('src/ui/market_window.ts')).toBe(false);
    expect(isPrivatePath('deploy/env/production.env')).toBe(true);
  });

  it('neutralizes private branding and keeps secret scanning fail-closed', () => {
    const sanitized = sanitizeText('Cryptic Realm https://crypticrealm.com $CR');
    expect(sanitized).toContain('World of ClaudeCraft');
    expect(sanitized).toContain('worldofclaudecraft.com');
    expect(secretMatches(sanitized)).toEqual([]);
    expect(secretMatches('DATABASE_URL=postgres://user:password@host/db')).not.toEqual([]);
  });

  it('records the non-publishing policy in the manifest', () => {
    const manifest = buildManifest({
      base: 'main',
      head: 'feature',
      files: ['src/ui/x.ts'],
      rejected: [],
    });
    expect(manifest.schema).toBe(1);
    expect(manifest.policy.pushesOrPullRequests).toBe(false);
  });
});
