import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
import {
  auditFacebookSurface,
  FBINSTANT_PUBLIC_API,
  findFacebookGlobalTokens,
  sanitizeFacebookCollisions,
} from '../scripts/facebook/private_api_guard.mjs';
import {
  DEFAULT_GAME_ORIGIN,
  FACEBOOK_CONTEXT_STORAGE_KEY,
  FACEBOOK_PROGRESS_EVENT,
  FACEBOOK_READY_EVENT,
  injectFacebookShell,
  LOCAL_ART_PATHS,
  rewriteCssUrls,
  rewriteRootRelativeHtml,
  stripTurnstileScript,
  validateShellWiring,
} from '../scripts/facebook/shell_inject.mjs';
import { crc32, createStoreZip } from '../scripts/facebook/zip_store.mjs';
import { FACEBOOK_CONTEXT_STORAGE_KEY as CLIENT_STORAGE_KEY } from '../src/game/facebook_context';
import {
  FACEBOOK_PROGRESS_EVENT as CLIENT_PROGRESS_EVENT,
  FACEBOOK_READY_EVENT as CLIENT_READY_EVENT,
} from '../src/game/facebook_instant';

const repoRoot = path.join(__dirname, '..');
const facebookDir = path.join(repoRoot, 'facebook');
const buildScript = path.join(repoRoot, 'scripts', 'build_facebook_bundle.mjs');
const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

// A minimal stand-in for the vite-built play.html: head, the sentinel inline
// script, the Turnstile include, bundle-relative built refs, and the kinds of
// root-relative public refs the rewriter must send to the game origin.
const FIXTURE_PLAY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Cryptic Realm</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="preload" as="image" href="./ui/cursors/arrow.png" />
<link rel="stylesheet" crossorigin href="./assets/play-fixture.css" />
<style>#loading-screen{background:#000 url("/loading-screen.jpg") center / cover no-repeat}</style>
</head>
<body>
<img src="/ui/ranks/frame.webp" alt="" />
<script type="module" crossorigin src="./assets/play-fixture.js"></script>
</body>
</html>
`;

function makeFixtureClientDist(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'cr-fb-client-'));
  tempDirs.push(dir);
  writeFileSync(path.join(dir, 'play.html'), FIXTURE_PLAY_HTML);
  mkdirSync(path.join(dir, 'assets'));
  // The FB identifier and the FB[..]-shaped regex reproduce the two literal
  // collisions Facebook's private-api grep rejected in the v2 bundle (a
  // minified hud local named FB, a vendor UA-sniff regex); the packager must
  // sanitize both on the way into the zip.
  writeFileSync(
    path.join(dir, 'assets', 'play-fixture.js'),
    'const FB={main:"woc_meters_frame"};console.log(FB.main,/FB[AS]V\\//.test(navigator.userAgent));\n',
  );
  writeFileSync(
    path.join(dir, 'assets', 'play-fixture.css'),
    'body{cursor:url("/ui/cursors/arrow.png") 7 2, default;background:url("/cryptic-realm-loading-bg.webp")}\n',
  );
  return dir;
}

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

describe('shell injection', () => {
  it('produces an entry page that passes the platform and wiring validators', () => {
    const html = rewriteRootRelativeHtml(
      stripTurnstileScript(injectFacebookShell(FIXTURE_PLAY_HTML)),
    );
    expect(validateEntryHtml(html)).toEqual([]);
    expect(validateShellWiring(html)).toEqual([]);
  });

  it('injects the SDK, the context seed, and the lifecycle after <head>', () => {
    const html = injectFacebookShell(FIXTURE_PLAY_HTML);
    const headAt = html.indexOf('<head>');
    expect(html.indexOf(FBINSTANT_SDK_URL)).toBeGreaterThan(headAt);
    expect(html.indexOf(FBINSTANT_SDK_URL)).toBeLessThan(html.indexOf('<link rel="icon"'));
    expect(html).toContain(`sessionStorage.setItem('${FACEBOOK_CONTEXT_STORAGE_KEY}', '1')`);
    for (const call of ['initializeAsync', 'setLoadingProgress', 'startGameAsync']) {
      expect(html).toContain(call);
    }
    // Injecting twice is a build bug, never a silent double-shell.
    expect(() => injectFacebookShell(html)).toThrow('already carries');
  });

  it('shares the context key and event names with the client modules', () => {
    // The shell page and src/game must agree or the fb gate and the loading
    // progress bridge silently stop working.
    expect(FACEBOOK_CONTEXT_STORAGE_KEY).toBe(CLIENT_STORAGE_KEY);
    expect(FACEBOOK_PROGRESS_EVENT).toBe(CLIENT_PROGRESS_EVENT);
    expect(FACEBOOK_READY_EVENT).toBe(CLIENT_READY_EVENT);
  });

  it('strips the Turnstile include', () => {
    const html = stripTurnstileScript(FIXTURE_PLAY_HTML);
    expect(html).not.toContain('challenges.cloudflare.com');
  });

  it('rewrites root-relative references to the game origin, keeping the bundle local', () => {
    const html = rewriteRootRelativeHtml(FIXTURE_PLAY_HTML, 'https://example.test');
    // Built assets stay bundle-relative.
    expect(html).toContain('src="./assets/play-fixture.js"');
    expect(html).toContain('href="./assets/play-fixture.css"');
    // Public refs (root-relative AND page-relative) go absolute.
    expect(html).toContain('src="https://example.test/ui/ranks/frame.webp"');
    expect(html).toContain('href="https://example.test/ui/cursors/arrow.png"');
    // Local art ships in the zip and stays relative.
    expect(html).toContain('href="./favicon.ico"');
    expect(html).toContain('url("./loading-screen.jpg")');
  });

  it('rewrites css urls with an assets-relative local prefix', () => {
    const css = rewriteCssUrls(
      'a{background:url("/ui/x.png")}b{background:url("/loading-screen.jpg")}c{background:url(data:image/png;base64,x)}',
      'https://example.test',
      '../',
    );
    expect(css).toContain('url("https://example.test/ui/x.png")');
    expect(css).toContain('url("../loading-screen.jpg")');
    expect(css).toContain('url(data:image/png;base64,x)');
  });

  it('flags missing wiring and leftover root-relative references', () => {
    const errors = validateShellWiring(
      '<html><head></head><body><img src="/ui/x.png"></body></html>',
    );
    expect(errors.some((e: string) => e.includes(FACEBOOK_CONTEXT_STORAGE_KEY))).toBe(true);
    expect(errors.some((e: string) => e.includes(FACEBOOK_PROGRESS_EVENT))).toBe(true);
    expect(errors.some((e: string) => e.includes('root-relative'))).toBe(true);
  });
});

describe('private api guard', () => {
  it('finds FB and FBInstant member accesses, quoted, dotted, and regex-shaped', () => {
    const tokens = findFacebookGlobalTokens(
      'FB.main; FB[e]; FBInstant.initializeAsync(); FBInstant["player"]; /FB[AS]V\\//; window.FBInstant;',
    );
    expect(tokens.map(({ kind, member }) => ({ kind, member }))).toEqual([
      { kind: 'FB', member: 'main' },
      { kind: 'FB', member: null },
      { kind: 'FBInstant', member: 'initializeAsync' },
      { kind: 'FBInstant', member: 'player' },
      { kind: 'FB', member: null },
    ]);
    // The bare window.FBInstant probe at the tail is not a member access.
    expect(tokens.every((t, i) => i === 0 || t.index > tokens[i - 1].index)).toBe(true);
  });

  it('accepts the public lifecycle and flags everything else', () => {
    expect(
      auditFacebookSurface(
        'window.FBInstant.initializeAsync().then(function(){FBInstant.setLoadingProgress(50);FBInstant.startGameAsync()})',
      ),
    ).toEqual([]);
    expect(FBINSTANT_PUBLIC_API.has('player')).toBe(true);
    const flagged = auditFacebookSurface(
      'FB.main; FBInstant._private(); FBInstant[method]();',
      'x.js',
    );
    expect(flagged.some((e) => e.includes('FB.* member access'))).toBe(true);
    expect(flagged.some((e) => e.includes('FBInstant._private'))).toBe(true);
    expect(flagged.some((e) => e.includes('computed or unparseable'))).toBe(true);
  });

  it('flags sandbox-escape, native-bridge, endpoint, and Meta Pixel patterns', () => {
    const cases: [string, string][] = [
      ['parent.postMessage(m, "*")', 'parent.postMessage'],
      ['if (window.self !== window.top) {}', 'window.top'],
      ['const p = window.parent', 'window.parent'],
      ['await navigator.sendBeacon(u, b)', 'navigator.sendBeacon'],
      ['const c = document.cookie', 'document.cookie'],
      ['navigator.serviceWorker.register("/sw.js")', 'serviceWorker.register'],
      ['e?.webkit?.messageHandlers?.bridge', 'webkit.messageHandlers'],
      ['const b = e.androidBridge', 'androidBridge'],
      ['MessengerExtensions.requestCloseBrowser()', 'MessengerExtensions'],
      ['const r = window.fbq; r("trackCustom")', 'fbq'],
      ['fetch("https://graph.facebook.com/me")', 'graph.facebook.com'],
      ['open("https://m.facebook.com/x")', 'm.facebook.com'],
    ];
    for (const [code, needle] of cases) {
      const errors = auditFacebookSurface(code, 'chunk.js');
      expect(
        errors.some((e) => e.includes(needle)),
        `${needle} in: ${code}`,
      ).toBe(true);
    }
  });

  it('allows ordinary navigation, worker messaging, and the one SDK include', () => {
    // Standard web navigation and Web Worker postMessage are not private-API
    // access; only parent/top/opener frame messaging is.
    expect(auditFacebookSurface('window.open(u, "_blank", "noopener,noreferrer")')).toEqual([]);
    expect(auditFacebookSurface('window.location.href = "/admin/"')).toEqual([]);
    expect(auditFacebookSurface('self.postMessage(x); worker.postMessage(y)')).toEqual([]);
    expect(auditFacebookSurface('if (a === b) {}')).toEqual([]);
    // The one sanctioned FBInstant SDK include passes; a second FB host does not.
    const shell = '<script src="https://connect.facebook.net/en_US/fbinstant.8.0.js"></script>';
    expect(auditFacebookSurface(shell, 'index.html')).toEqual([]);
    expect(
      auditFacebookSurface(`${shell}<img src="https://connect.facebook.net/tr">`, 'index.html'),
    ).not.toEqual([]);
  });

  it('renames a Meta Pixel member read so the fbq literal never ships', () => {
    const code = 'function t(){let r=window.fbq;if(typeof r=="function")r("trackCustom")}';
    const out = sanitizeFacebookCollisions(code, 'chunk.js');
    // The standalone `window.fbq` read is gone (the renamed `window.fbqUnavailable`
    // contains it only as a prefix substring, so match on a word boundary).
    expect(/window\.fbq\b/.test(out)).toBe(false);
    expect(out).toContain('window.fbqUnavailable');
    expect(auditFacebookSurface(out, 'chunk.js')).toEqual([]);
    // A computed pixel access is neutralized the same way.
    const computed = sanitizeFacebookCollisions('const r=window["fbq"];', 'c2.js');
    expect(auditFacebookSurface(computed, 'c2.js')).toEqual([]);
  });

  it('renames a minified FB identifier and escapes literal collisions', () => {
    const code =
      'const FB={main:`k`,heal:`h`};use(FB.main,FB[e]);const re=/FB[AS]V\\//;const s="FB[x]";';
    const out = sanitizeFacebookCollisions(code, 'chunk.js');
    expect(auditFacebookSurface(out, 'chunk.js')).toEqual([]);
    expect(out).toContain('Fb_0={main:`k`');
    expect(out).toContain('use(Fb_0.main,Fb_0[e])');
    // Regex and string values are preserved byte for byte at runtime: the B
    // becomes a B escape, which evaluates to the same character.
    expect(out).toContain('/F\\u0042[AS]V\\//');
    expect(out).toContain('"F\\u0042[x]"');
  });

  it('leaves clean code untouched and refuses shapes it cannot prove safe', () => {
    const clean = 'globalThis.FBInstant !== void 0 && window.FBInstant.startGameAsync();';
    expect(sanitizeFacebookCollisions(clean, 'clean.js')).toBe(clean);
    expect(() => sanitizeFacebookCollisions('use(o.FB.main);', 'prop.js')).toThrow(
      'property/key name',
    );
  });
});

describe('entry html validation', () => {
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

  it('packages a staged client into a passing bundle', () => {
    const clientDist = makeFixtureClientDist();
    const outDir = mkdtempSync(path.join(tmpdir(), 'cr-fb-bundle-'));
    tempDirs.push(outDir);
    const stdout = execFileSync(
      process.execPath,
      [buildScript, '--client-dist', clientDist, '--out-dir', outDir],
      { cwd: repoRoot, encoding: 'utf8', timeout: 30_000 },
    );
    expect(stdout).toContain('[facebook-bundle] PASS');
    const zips = readdirSync(outDir).filter((name) => name.endsWith('.zip'));
    expect(zips.length).toBe(1);
    expect(zips[0]).toMatch(/^cryptic-realm-instant-games-v.+\.zip$/);
    const zip = readFileSync(path.join(outDir, zips[0]));
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    // The real client plus the local support files land in the zip: the
    // transformed entry page, the built assets, the KTX2 transcoder, the
    // local art, and the platform config.
    for (const name of [
      'index.html',
      'fbapp-config.json',
      'assets/play-fixture.js',
      'assets/play-fixture.css',
      'basis/basis_transcoder.wasm',
      ...LOCAL_ART_PATHS.map((p) => p.slice(1)),
    ]) {
      expect(zip.includes(Buffer.from(name, 'utf8'))).toBe(true);
    }
    // The staged page kept the shell contract: SDK + lifecycle + origin rewrites.
    expect(zip.includes(Buffer.from(FBINSTANT_SDK_URL, 'utf8'))).toBe(true);
    expect(zip.includes(Buffer.from(`${DEFAULT_GAME_ORIGIN}/ui/ranks/frame.webp`, 'utf8'))).toBe(
      true,
    );
    // The private-api guard sanitized the fixture's deliberate collisions on
    // the way in: no FB member literal ships, the rename and the value-
    // preserving regex escape do.
    expect(zip.includes(Buffer.from('FB.main', 'utf8'))).toBe(false);
    expect(zip.includes(Buffer.from('FB[AS]V', 'utf8'))).toBe(false);
    expect(zip.includes(Buffer.from('Fb_0.main', 'utf8'))).toBe(true);
    expect(zip.includes(Buffer.from('F\\u0042[AS]V', 'utf8'))).toBe(true);
  });
});
