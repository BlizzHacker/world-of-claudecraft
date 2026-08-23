// Facebook Instant Games shell injection: pure string transforms that turn the
// vite-built play.html into the bundle's index.html. Kept as data + pure
// functions so the build script (scripts/build_facebook_bundle.mjs) and the
// vitest (tests/facebook_bundle.test.ts) share one source of truth.
//
// Architecture (docs/facebook-release.md): the REAL game client ships inside
// the zip. Facebook's container CSP (frame-src 'self' + the app's own fbsbx
// host + blob:) blocks framing crypticrealm.com outright, so the bundle page
// runs the built client and streams every heavy asset over fetch/XHR/WebSocket
// from the live site (connect-src, which the platform blesses). The FBInstant
// lifecycle lives in an inline shell script in THIS page because the platform
// validator requires the calls in index.html and because progress must be
// reportable while the game module is still downloading. The game module
// reports its real milestones via the two DOM events below
// (src/game/facebook_instant.ts is the emitting half).

export const FBINSTANT_SDK_URL = 'https://connect.facebook.net/en_US/fbinstant.8.0.js';
export const FACEBOOK_CONTEXT_STORAGE_KEY = 'cr_facebook_shell';
export const FACEBOOK_PROGRESS_EVENT = 'cr-fb-progress';
export const FACEBOOK_READY_EVENT = 'cr-fb-ready';
export const DEFAULT_GAME_ORIGIN = 'https://crypticrealm.com';

// Art the bundle carries locally (zip root) instead of streaming from the game
// origin, as { urlPath, bundleName, sourceFile }: urlPath is what the built
// page/CSS references, bundleName is the zip entry the rewrite points at, and
// sourceFile is the file under public/ to copy. Everything else that is
// root-relative in the built HTML/CSS is rewritten to an absolute URL on the
// game origin.
//
// The BRAND images are here because Facebook's container CSP has an img-src
// allowlist that does not include crypticrealm.com: a remote <img> is not a
// silent degradation, it paints a broken-image glyph plus alt text. bundleName
// may differ from urlPath so the bundle can ship a much smaller equivalent
// (the 512 webp logo is 100 KB against the 1.4 MB png the site serves); the
// rewrite maps the reference to the shipped name, so nothing 404s.
export const BUNDLED_ART = [
  { urlPath: '/favicon.ico', bundleName: 'favicon.ico', sourceFile: 'favicon.ico' },
  {
    urlPath: '/favicon-16x16.png',
    bundleName: 'favicon-16x16.png',
    sourceFile: 'favicon-16x16.png',
  },
  {
    urlPath: '/favicon-32x32.png',
    bundleName: 'favicon-32x32.png',
    sourceFile: 'favicon-32x32.png',
  },
  {
    urlPath: '/loading-screen.jpg',
    bundleName: 'loading-screen.jpg',
    sourceFile: 'loading-screen.jpg',
  },
  {
    urlPath: '/cryptic-realm-loading-bg.webp',
    bundleName: 'cryptic-realm-loading-bg.webp',
    sourceFile: 'cryptic-realm-loading-bg.webp',
  },
  // Brand marks painted as <img>: the nav/header mark, and the title logo above
  // the login card (also reused as the loading-screen overlay logo).
  { urlPath: '/icon-192.png', bundleName: 'icon-192.png', sourceFile: 'icon-192.png' },
  {
    urlPath: '/cryptic-realm-logo.png',
    bundleName: 'cryptic-realm-logo-512.webp',
    sourceFile: 'cryptic-realm-logo-512.webp',
  },
];

/** The url paths served from inside the bundle (compat + audit convenience). */
export const LOCAL_ART_PATHS = BUNDLED_ART.map((art) => art.urlPath);

/** The zip entry name for a bundled url path, or null when it stays remote. */
export function bundledArtName(urlPath) {
  return BUNDLED_ART.find((art) => art.urlPath === urlPath)?.bundleName ?? null;
}

/** The inline shell block injected right after <head>. Three scripts, in
 *  order: the fb-context seed (must run before the deferred game module
 *  executes), the FBInstant SDK include, and the lifecycle owner. */
export function buildShellScripts() {
  return `
<script>
  // Cryptic Realm Instant Games shell. Seed the Facebook context flag BEFORE
  // the game module executes: src/game/facebook_context.ts reads this
  // sessionStorage key at import time to gate the wallet, daily-reward, and
  // purchase surfaces Facebook policy does not allow.
  try { sessionStorage.setItem('${FACEBOOK_CONTEXT_STORAGE_KEY}', '1'); } catch (err) {}

  // Broken-image suppression. The container's img-src allowlist does not
  // include the game origin, so any <img> still pointing there is blocked, and
  // a blocked image is NOT invisible: the browser paints a broken-image glyph
  // plus the alt text. The brand marks ship inside the bundle so they render
  // normally; this is the safety net for anything else (a missing file, an
  // image added later). visibility rather than display so the element keeps its
  // box and no surrounding layout reflows. Capture phase, because resource
  // error events do not bubble; registered here, in <head>, so it is listening
  // before the body's images start loading.
  window.addEventListener('error', function (ev) {
    var el = ev && ev.target;
    if (el && el.tagName === 'IMG') el.style.visibility = 'hidden';
  }, true);
</script>
<script src="${FBINSTANT_SDK_URL}"></script>
<script>
  // FBInstant lifecycle owner. Loading progress uses REAL milestones only:
  // initializeAsync resolved (15), the game module graph executing (60, sent
  // by src/main.ts via the ${FACEBOOK_PROGRESS_EVENT} event), and the
  // login/character screen interactive (${FACEBOOK_READY_EVENT}), which maps
  // to setLoadingProgress(100) + startGameAsync. Never a timer pretending to
  // be progress; the one timer below is a never-stuck failsafe.
  (function () {
    'use strict';
    var READY_FAILSAFE_MS = 45000;
    var initialized = false;
    var started = false;
    var readyWanted = false;
    var pending = 0;
    var reported = 0;
    function noop() {}
    function report(pct) {
      if (typeof pct !== 'number' || !isFinite(pct)) return;
      if (pct > pending) pending = Math.min(99, pct);
      if (!initialized || started || pending <= reported) return;
      reported = pending;
      try { window.FBInstant.setLoadingProgress(reported); } catch (err) {}
    }
    function start() {
      readyWanted = true;
      if (started || !initialized || !window.FBInstant) return;
      started = true;
      try { window.FBInstant.setLoadingProgress(100); } catch (err) {}
      try { window.FBInstant.startGameAsync().then(noop, noop); } catch (err) {}
    }
    window.addEventListener('${FACEBOOK_PROGRESS_EVENT}', function (ev) {
      report(ev && ev.detail && ev.detail.pct);
    });
    window.addEventListener('${FACEBOOK_READY_EVENT}', start);
    if (window.FBInstant) {
      window.FBInstant.initializeAsync().then(function () {
        initialized = true;
        report(15);
        if (readyWanted) start();
        // Never-stuck failsafe: a lost ready signal (a fatal boot error)
        // must surface the game's own error screen, not an endless Facebook
        // loading screen.
        setTimeout(start, READY_FAILSAFE_MS);
      }, noop);
    }
    // No FBInstant global (opened outside the container, or the SDK include
    // was blocked): the game boots and runs on its own; nothing to report to.
  })();
</script>`;
}

/** Insert the shell block immediately after the opening <head> tag. */
export function injectFacebookShell(html) {
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('facebook shell: empty html');
  }
  if (html.includes(FBINSTANT_SDK_URL)) {
    throw new Error('facebook shell: html already carries the FBInstant SDK include');
  }
  const match = /<head[^>]*>/i.exec(html);
  if (!match) throw new Error('facebook shell: no <head> tag to inject after');
  const at = match.index + match[0].length;
  return html.slice(0, at) + buildShellScripts() + html.slice(at);
}

/** Drop the static Cloudflare Turnstile include: the container CSP blocks the
 *  third-party script, and the bundle builds without a Turnstile site key, so
 *  the tag could only produce a console error. */
export function stripTurnstileScript(html) {
  return html.replace(
    /[ \t]*<script src="https:\/\/challenges\.cloudflare\.com\/[^"]*"[^>]*><\/script>\n?/g,
    '',
  );
}

/**
 * Rewrite root-relative references in the built page so they resolve on the
 * Facebook hosting origin, where none of the site's public/ tree exists:
 * - src="/x" and href="/x" become absolute URLs on the game origin (a BUNDLED_ART
 *   path becomes bundle-relative "./<bundleName>" instead);
 * - src="./x" and href="./x" page-relative public refs (the cursor preloads)
 *   are rewritten the same way, except vite's own "./assets/..." output and
 *   the bundled "./basis/..." transcoder, which must stay in-bundle;
 * - url(/x) in inline <style> blocks and style attributes follows the same
 *   rule via rewriteCssUrls with a page-relative local prefix.
 * Protocol-relative (//) and absolute (https:) URLs pass through untouched.
 */
export function rewriteRootRelativeHtml(html, origin = DEFAULT_GAME_ORIGIN) {
  const attr = html.replace(
    /(\b(?:src|href)=")(\.?\/(?!\/)[^"]*)(")/g,
    (whole, before, path, after) => {
      let clean = path;
      if (clean.startsWith('./')) {
        clean = clean.slice(1); // './ui/x' -> '/ui/x'
        if (clean.startsWith('/assets/') || clean.startsWith('/basis/')) return whole;
      }
      const bundled = bundledArtName(clean.split('?')[0]);
      if (bundled) return `${before}./${bundled}${after}`;
      return `${before}${origin}${clean}${after}`;
    },
  );
  return rewriteCssUrls(attr, origin, './');
}

/**
 * Rewrite root-relative url(/x) references in CSS text to the game origin.
 * localPrefix maps a BUNDLED_ART path into the bundle: './' for CSS inlined in
 * index.html at the zip root, '../' for emitted assets/*.css files.
 */
export function rewriteCssUrls(css, origin = DEFAULT_GAME_ORIGIN, localPrefix = '../') {
  return css.replace(/url\((['"]?)(\/(?!\/)[^)'"]+)\1\)/g, (whole, quote, path) => {
    const bundled = bundledArtName(path.split('?')[0]);
    if (bundled) return `url(${quote}${localPrefix}${bundled}${quote})`;
    return `url(${quote}${origin}${path}${quote})`;
  });
}

/** Bundle-side wiring rules beyond the platform validator: the fb-context
 *  seed and both lifecycle events must be present in the entry html. Returns
 *  a list of problems (empty = ok). */
export function validateShellWiring(html) {
  const errors = [];
  if (!html.includes(FACEBOOK_CONTEXT_STORAGE_KEY)) {
    errors.push(`index.html must seed sessionStorage ${FACEBOOK_CONTEXT_STORAGE_KEY}`);
  }
  for (const event of [FACEBOOK_PROGRESS_EVENT, FACEBOOK_READY_EVENT]) {
    if (!html.includes(event)) {
      errors.push(`index.html must listen for the ${event} event`);
    }
  }
  // Anything still page-relative must be a real bundle entry: vite's own
  // output, the KTX2 transcoder, or one of the BUNDLED_ART names. Derived from
  // BUNDLED_ART so adding local art cannot desync this allowlist.
  const localNames = ['assets/', 'basis/', ...BUNDLED_ART.map((art) => art.bundleName)];
  const allowed = localNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (new RegExp(`(?:src|href)="\\.?/(?!${allowed})`).test(html)) {
    errors.push('index.html still carries a root-relative reference outside the bundle');
  }
  return errors;
}
