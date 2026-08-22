// Pure validation for the Meta Quest PWA lane
// (scripts/lib/meta_pwa_validate.mjs; orchestrated by
// scripts/build_meta_pwa.mjs, runbook in docs/meta-quest-release.md).
// Also pins that the SHIPPED public/manifest.webmanifest passes with zero
// errors, so a manifest edit that would break Quest packaging fails here
// before it reaches the store flow.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  androidVersionCode,
  crossCheckTwaManifest,
  iconMaxEdge,
  META_MIN_ICON_PX,
  validateMetaPwaManifest,
  type WebManifestLike,
} from '../scripts/lib/meta_pwa_validate.mjs';

const repoRoot = join(__dirname, '..');

function validManifest(): WebManifestLike {
  return {
    name: 'Cryptic Realm',
    short_name: 'Cryptic Realm',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    orientation: 'landscape',
    icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}

describe('iconMaxEdge', () => {
  it('reads the largest square edge across size tokens', () => {
    expect(iconMaxEdge({ sizes: '192x192 512x512' })).toBe(512);
    expect(iconMaxEdge({ sizes: '512x256' })).toBe(256);
    expect(iconMaxEdge({ sizes: 'any' })).toBe(Number.POSITIVE_INFINITY);
    expect(iconMaxEdge({ sizes: '' })).toBe(0);
    expect(iconMaxEdge({})).toBe(0);
    expect(iconMaxEdge(undefined)).toBe(0);
  });
});

describe('validateMetaPwaManifest', () => {
  it('passes a minimal valid manifest with no errors', () => {
    const { errors } = validateMetaPwaManifest(validManifest());
    expect(errors).toEqual([]);
  });

  it('rejects a non-object manifest', () => {
    expect(validateMetaPwaManifest(null).errors).toEqual(['manifest is not a JSON object']);
  });

  it('requires name, short_name, start_url, and display', () => {
    const { errors } = validateMetaPwaManifest({});
    for (const field of ['name', 'short_name', 'start_url', 'display', 'icons']) {
      expect(errors).toContain(`missing required field: ${field}`);
    }
  });

  it('rejects display: browser (no standalone panel)', () => {
    const manifest = { ...validManifest(), display: 'browser' };
    expect(validateMetaPwaManifest(manifest).errors.some((e) => e.startsWith('display'))).toBe(
      true,
    );
  });

  it('requires a 512px-or-larger icon', () => {
    const manifest = {
      ...validManifest(),
      icons: [{ src: '/icon-192.png', sizes: '192x192' }],
    };
    expect(
      validateMetaPwaManifest(manifest).errors.some((e) =>
        e.includes(`${META_MIN_ICON_PX}x${META_MIN_ICON_PX}`),
      ),
    ).toBe(true);
  });

  it('rejects a start_url outside the declared scope', () => {
    const manifest = { ...validManifest(), scope: '/app/', start_url: '/' };
    expect(validateMetaPwaManifest(manifest).errors.some((e) => e.includes('outside scope'))).toBe(
      true,
    );
  });

  it('warns, never errors, on store-quality gaps', () => {
    const manifest = validManifest();
    delete manifest.orientation;
    delete manifest.scope;
    const { errors, warnings } = validateMetaPwaManifest(manifest);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('orientation'))).toBe(true);
    expect(warnings.some((w) => w.includes('scope'))).toBe(true);
    expect(warnings.some((w) => w.includes('maskable'))).toBe(true);
    expect(warnings.some((w) => w.includes('id field'))).toBe(true);
  });

  it('warns per expected cross-origin host missing from additional_trusted_origins', () => {
    const { warnings } = validateMetaPwaManifest(validManifest(), {
      expectedTrustedOrigins: ['authentik.moveweight.com'],
    });
    expect(warnings.some((w) => w.includes('authentik.moveweight.com'))).toBe(true);
    const declared = {
      ...validManifest(),
      additional_trusted_origins: ['https://authentik.moveweight.com'],
    };
    const clean = validateMetaPwaManifest(declared, {
      expectedTrustedOrigins: ['authentik.moveweight.com'],
    });
    expect(clean.warnings.some((w) => w.includes('authentik.moveweight.com'))).toBe(false);
  });

  it('accepts the SHIPPED public/manifest.webmanifest with zero errors', () => {
    const shipped = JSON.parse(
      readFileSync(join(repoRoot, 'public', 'manifest.webmanifest'), 'utf8'),
    ) as WebManifestLike;
    expect(validateMetaPwaManifest(shipped).errors).toEqual([]);
  });
});

describe('androidVersionCode', () => {
  it('derives a monotonic code from the released triple, ignoring pre-release tags', () => {
    expect(androidVersionCode('0.35.1-cr.1')).toBe(35_001);
    expect(androidVersionCode('1.2.3')).toBe(1_002_003);
    expect(androidVersionCode('0.36.0')).toBeGreaterThan(androidVersionCode('0.35.9'));
  });

  it('throws on shapes it cannot order', () => {
    expect(() => androidVersionCode('not-a-version')).toThrow();
    expect(() => androidVersionCode('1.1000.0')).toThrow();
  });
});

describe('crossCheckTwaManifest', () => {
  const expected = {
    expectedPackageId: 'com.crypticrealm.quest',
    expectedVersionName: '0.35.1-cr.1',
  };

  function validTwa() {
    return {
      packageId: 'com.crypticrealm.quest',
      host: 'crypticrealm.com',
      isMetaQuest: true,
      webManifestUrl: 'https://crypticrealm.com/manifest.webmanifest',
      appVersionName: '0.35.1-cr.1',
      appVersionCode: 35_001,
      orientation: 'landscape',
      signingKey: { path: './meta/keys/quest-release.keystore', alias: 'crypticrealm-quest' },
    };
  }

  it('passes the reference config with no errors', () => {
    expect(crossCheckTwaManifest(validTwa(), expected).errors).toEqual([]);
  });

  it('errors on a drifted packageId (store identity is keyed on it)', () => {
    const twa = { ...validTwa(), packageId: 'com.crypticrealm.other' };
    expect(crossCheckTwaManifest(twa, expected).errors.some((e) => e.includes('packageId'))).toBe(
      true,
    );
  });

  it('errors on missing metaquest flag, https manifest URL, signing key, or version code', () => {
    const { errors } = crossCheckTwaManifest({ packageId: 'com.crypticrealm.quest' }, expected);
    expect(errors.some((e) => e.includes('isMetaQuest'))).toBe(true);
    expect(errors.some((e) => e.includes('webManifestUrl'))).toBe(true);
    expect(errors.some((e) => e.includes('signingKey'))).toBe(true);
    expect(errors.some((e) => e.includes('appVersionCode'))).toBe(true);
  });

  it('warns on version drift and an orientation mismatch with the web manifest', () => {
    const twa = { ...validTwa(), appVersionName: '0.34.0', appVersionCode: 7, orientation: 'any' };
    const { errors, warnings } = crossCheckTwaManifest(twa, {
      ...expected,
      webManifest: { orientation: 'landscape' },
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('appVersionName'))).toBe(true);
    expect(warnings.some((w) => w.includes('appVersionCode'))).toBe(true);
    expect(warnings.some((w) => w.includes('orientation'))).toBe(true);
  });

  it('accepts the CHECKED-IN meta/twa-manifest.json against the shipped manifest', () => {
    const twa = JSON.parse(readFileSync(join(repoRoot, 'meta', 'twa-manifest.json'), 'utf8'));
    const webManifest = JSON.parse(
      readFileSync(join(repoRoot, 'public', 'manifest.webmanifest'), 'utf8'),
    ) as WebManifestLike;
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      version: string;
    };
    const result = crossCheckTwaManifest(twa, {
      webManifest,
      expectedPackageId: 'com.crypticrealm.quest',
      expectedVersionName: pkg.version,
    });
    expect(result.errors).toEqual([]);
  });
});
