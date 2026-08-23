import { describe, expect, it } from 'vitest';
import { assetHostUrl, resolveAssetPath } from '../src/client_origin';

// The remote asset origin + locally-bundled art policy (src/client_origin.ts).
// The Facebook Instant Games bundle is the build that exercises both arms: its
// page ships no public/ tree, so most assets stream from the game origin, but
// the brand marks and loading backdrops ride INSIDE the zip because the
// container's img-src CSP does not allow the game origin.
const ORIGIN = 'https://crypticrealm.com';
const LOCAL = {
  '/cryptic-realm-logo.png': 'cryptic-realm-logo-512.webp',
  '/loading-screen.jpg': 'loading-screen.jpg',
};

describe('resolveAssetPath', () => {
  it('is the identity function with neither origin nor local art configured', () => {
    // The website build: page-relative URLs already resolve correctly.
    expect(resolveAssetPath('/models/x.glb', '', {})).toBe('/models/x.glb');
    expect(resolveAssetPath('/audio/music/vale.mp3', '', {})).toBe('/audio/music/vale.mp3');
  });

  it('prefixes the remote origin when one is configured', () => {
    expect(resolveAssetPath('/models/x.glb', ORIGIN, {})).toBe(`${ORIGIN}/models/x.glb`);
    // A path without the leading slash still produces exactly one.
    expect(resolveAssetPath('models/x.glb', ORIGIN, {})).toBe(`${ORIGIN}/models/x.glb`);
  });

  it('resolves locally-bundled art page-relative, never against the origin', () => {
    // The whole point: these must NOT become remote URLs, or the container CSP
    // blocks them (a broken-image glyph for <img>, a blank box for a CSS
    // background). The bundle name may differ from the url path, so the
    // reference lands on the file the zip actually carries.
    expect(resolveAssetPath('/cryptic-realm-logo.png', ORIGIN, LOCAL)).toBe(
      './cryptic-realm-logo-512.webp',
    );
    expect(resolveAssetPath('/loading-screen.jpg', ORIGIN, LOCAL)).toBe('./loading-screen.jpg');
    // A query string selects the same entry (cache busters must not miss).
    expect(resolveAssetPath('/loading-screen.jpg?v=2', ORIGIN, LOCAL)).toBe('./loading-screen.jpg');
    // Anything not bundled still goes remote.
    expect(resolveAssetPath('/cryptic-realm-loading.png', ORIGIN, LOCAL)).toBe(
      `${ORIGIN}/cryptic-realm-loading.png`,
    );
  });

  it('never rewrites an already-absolute or inline URL', () => {
    for (const url of [
      'https://example.test/a.png',
      'http://example.test/a.png',
      '//example.test/a.png',
      'data:image/png;base64,AAA',
      'blob:https://example.test/abc',
    ]) {
      expect(resolveAssetPath(url, ORIGIN, LOCAL)).toBe(url);
    }
  });
});

describe('assetHostUrl', () => {
  it('is the identity function in a plain test/website build', () => {
    // No VITE_ASSET_ORIGIN and no VITE_LOCAL_ASSET_MAP are set under Vitest, so
    // the shipped wrapper must not perturb any existing caller.
    expect(assetHostUrl('/models/x.glb')).toBe('/models/x.glb');
    expect(assetHostUrl('/audio/cryptic')).toBe('/audio/cryptic');
  });
});
