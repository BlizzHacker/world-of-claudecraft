#!/usr/bin/env node
// Build the uploadable Facebook Instant Games bundle. The bundle ships the
// REAL game client: a facebook-mode vite build of the play entry (relative
// base, no public/ copy; see the WOC_FACEBOOK_BUNDLE branch in vite.config.ts)
// whose page is transformed into the bundle's index.html (FBInstant shell
// injection + root-relative URL rewrites, scripts/facebook/shell_inject.mjs).
// Every heavy asset (models, media, audio, textures, ui art) streams from the
// live site at runtime via VITE_ASSET_ORIGIN / VITE_API_ORIGIN
// (src/client_origin.ts); the zip carries only the built JS/CSS/HTML, the
// KTX2 transcoder, the favicons + loading backdrops, and fbapp-config.json.
// Upload the resulting zip in the App Dashboard under Instant Games > Web
// Hosting (runbook: docs/facebook-release.md).
//
// Usage: node scripts/build_facebook_bundle.mjs [--out-dir <dir>]
//          [--client-dist <dir>] [--origin <https://...>]
//   --client-dist: package an already-built client directory and skip the
//                  vite build (the tests drive this with a small fixture).
//   --origin: the game origin assets/REST/WS resolve against
//             (default https://crypticrealm.com).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateBundleSize,
  MAX_BUNDLE_BYTES,
  RECOMMENDED_INITIAL_BUNDLE_BYTES,
  validateBundleEntryNames,
  validateEntryHtml,
  validateFbappConfig,
} from './facebook/bundle_rules.mjs';
import { auditFacebookSurface, sanitizeFacebookCollisions } from './facebook/private_api_guard.mjs';
import {
  DEFAULT_GAME_ORIGIN,
  injectFacebookShell,
  LOCAL_ART_PATHS,
  rewriteCssUrls,
  rewriteRootRelativeHtml,
  stripTurnstileScript,
  validateShellWiring,
} from './facebook/shell_inject.mjs';
import { createStoreZip } from './facebook/zip_store.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {
    outDir: path.join(repoRoot, 'dist-facebook'),
    clientDist: null,
    origin: DEFAULT_GAME_ORIGIN,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const take = (name) => {
      const value = argv[i + 1];
      if (!value) throw new Error(`${name} needs an argument`);
      i += 1;
      return value;
    };
    if (argv[i] === '--out-dir') args.outDir = path.resolve(take('--out-dir'));
    else if (argv[i] === '--client-dist') args.clientDist = path.resolve(take('--client-dist'));
    else if (argv[i] === '--origin') args.origin = take('--origin');
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

/** Run the facebook-mode vite build of the play entry into dist-facebook/client. */
function buildClient(origin) {
  const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  console.log('[facebook-bundle] building the client (vite, facebook mode)...');
  const result = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      WOC_FACEBOOK_BUNDLE: '1',
      // REST + WebSocket resolve absolute against the live site
      // (src/client_origin.ts NATIVE_API_ORIGIN), and so does every runtime
      // asset URL (assetHostUrl). The KTX2 transcoder is the one exception:
      // it ships inside the zip, page-relative, because every GLB parse
      // depends on it and a page-relative fetch has no CORS or CSP exposure.
      VITE_API_ORIGIN: origin,
      VITE_ASSET_ORIGIN: origin,
      VITE_KTX2_TRANSCODER_PATH: 'basis/',
      // The container CSP blocks the Turnstile widget script, so a site key
      // could only wedge the login form; build without one (empty = unset).
      VITE_TURNSTILE_SITEKEY: '',
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`vite build failed with exit code ${result.status}`);
  }
  return path.join(repoRoot, 'dist-facebook', 'client');
}

/** Collect files recursively as sorted zip-relative names (dotfiles skipped). */
function collectFiles(dir, prefix = '') {
  const names = [];
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith('.')) continue;
    const relative = prefix ? `${prefix}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      names.push(...collectFiles(path.join(dir, dirent.name), relative));
    } else if (dirent.isFile()) {
      names.push(relative);
    }
  }
  return names.sort();
}

/**
 * Assemble the bundle's zip entries from a built client directory. Exported
 * shape for the build flow; the vitest exercises it end-to-end through the
 * CLI with a fixture --client-dist.
 */
function stageEntries(clientDist, origin) {
  const playPath = path.join(clientDist, 'play.html');
  if (!existsSync(playPath)) {
    throw new Error(`built client has no play.html at ${playPath} (run the vite build first)`);
  }
  const entries = [];

  // The built play page becomes the bundle's index.html: FBInstant shell in,
  // Turnstile include out, root-relative references rewritten to the game
  // origin (or to the bundled local art).
  const raw = readFileSync(playPath, 'utf8');
  const indexHtml = rewriteRootRelativeHtml(stripTurnstileScript(injectFacebookShell(raw)), origin);
  entries.push({ name: 'index.html', data: Buffer.from(indexHtml, 'utf8') });

  // Everything else vite emitted (assets/*.js, *.css, worker chunks, lazy
  // locale chunks). CSS gets the same root-relative rewrite, with local art
  // reached from assets/ via '../'. JS goes through the private-api guard:
  // Facebook's upload validator greps the bundle for FB.*/FBInstant.* member
  // literals, and minifier-generated identifiers or vendor regexes can
  // collide with that net (scripts/facebook/private_api_guard.mjs).
  for (const name of collectFiles(clientDist)) {
    if (name === 'play.html') continue;
    const file = path.join(clientDist, ...name.split('/'));
    if (name.endsWith('.css')) {
      entries.push({
        name,
        data: Buffer.from(rewriteCssUrls(readFileSync(file, 'utf8'), origin, '../'), 'utf8'),
      });
    } else if (name.endsWith('.js') || name.endsWith('.mjs')) {
      entries.push({
        name,
        data: Buffer.from(sanitizeFacebookCollisions(readFileSync(file, 'utf8'), name), 'utf8'),
      });
    } else {
      entries.push({ name, data: readFileSync(file) });
    }
  }

  // The KTX2/Basis transcoder ships in-bundle (VITE_KTX2_TRANSCODER_PATH
  // 'basis/'): every GLB parse depends on it, so it must not hang off
  // cross-origin fetch, CORS, or the container's CSP.
  const basisDir = path.join(repoRoot, 'public', 'basis');
  for (const name of collectFiles(basisDir)) {
    const file = path.join(basisDir, name);
    entries.push({
      name: `basis/${name}`,
      data: name.endsWith('.js')
        ? Buffer.from(sanitizeFacebookCollisions(readFileSync(file, 'utf8'), `basis/${name}`))
        : readFileSync(file),
    });
  }

  // Minimum local art: favicons + the world-entry loading backdrops.
  for (const artPath of LOCAL_ART_PATHS) {
    const file = path.join(repoRoot, 'public', ...artPath.slice(1).split('/'));
    if (!existsSync(file)) {
      throw new Error(`local art missing from public/: ${artPath}`);
    }
    entries.push({ name: artPath.slice(1), data: readFileSync(file) });
  }

  entries.push({
    name: 'fbapp-config.json',
    data: readFileSync(path.join(repoRoot, 'facebook', 'fbapp-config.json')),
  });

  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return entries;
}

function fail(errors) {
  for (const error of errors) console.error(`[facebook-bundle] ERROR: ${error}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const clientDist = args.clientDist ?? buildClient(args.origin);
  const entries = stageEntries(clientDist, args.origin);
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]));

  const indexHtml = byName.get('index.html').toString('utf8');
  const errors = [
    ...validateBundleEntryNames(entries.map((entry) => entry.name)),
    ...validateEntryHtml(indexHtml),
    ...validateShellWiring(indexHtml),
    // Facebook's upload validator greps the whole bundle for FB.*/FBInstant.*
    // member literals ("Must Not Call Private APIs"); gate every text entry so
    // a future chunk that reintroduces a collision fails HERE, not at upload.
    ...entries.flatMap((entry) =>
      /\.(js|mjs|css|html|json)$/.test(entry.name)
        ? auditFacebookSurface(entry.data.toString('utf8'), entry.name)
        : [],
    ),
    ...(() => {
      try {
        return validateFbappConfig(JSON.parse(byName.get('fbapp-config.json').toString('utf8')));
      } catch (err) {
        return [`fbapp-config.json is not valid JSON: ${err.message}`];
      }
    })(),
  ];
  if (errors.length > 0) fail(errors);

  const zip = createStoreZip(entries);
  const size = evaluateBundleSize(zip.length);
  for (const warning of size.warnings) console.warn(`[facebook-bundle] WARNING: ${warning}`);
  if (size.errors.length > 0) fail(size.errors);

  const version = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
  mkdirSync(args.outDir, { recursive: true });
  const zipPath = path.join(args.outDir, `cryptic-realm-instant-games-v${version}.zip`);
  writeFileSync(zipPath, zip);

  console.log(`[facebook-bundle] wrote ${zipPath}`);
  console.log(`[facebook-bundle] entries: ${entries.length} files`);
  console.log(
    `[facebook-bundle] size: ${zip.length} bytes ` +
      `(limit ${MAX_BUNDLE_BYTES}, recommended initial ${RECOMMENDED_INITIAL_BUNDLE_BYTES})`,
  );
  console.log('[facebook-bundle] PASS');
}

main();
