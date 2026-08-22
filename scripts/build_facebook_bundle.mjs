#!/usr/bin/env node
// Build the uploadable Facebook Instant Games bundle: zip facebook/ (the thin
// shell that frames the live site, see facebook/index.html) into the
// gitignored dist-facebook/ directory and validate it against the platform
// rules in scripts/facebook/bundle_rules.mjs. Upload the resulting zip in the
// App Dashboard under Instant Games > Web Hosting (runbook:
// docs/facebook-release.md).
//
// Usage: node scripts/build_facebook_bundle.mjs [--out-dir <dir>]

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { createStoreZip } from './facebook/zip_store.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(repoRoot, 'facebook');

function parseArgs(argv) {
  const args = { outDir: path.join(repoRoot, 'dist-facebook') };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out-dir') {
      const value = argv[i + 1];
      if (!value) throw new Error('--out-dir needs a directory argument');
      args.outDir = path.resolve(value);
      i += 1;
    } else {
      throw new Error(`unknown argument: ${argv[i]}`);
    }
  }
  return args;
}

/** Collect bundle files recursively as sorted zip-relative names (dotfiles skipped). */
function collectBundleFiles(dir, prefix = '') {
  const names = [];
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith('.')) continue;
    const relative = prefix ? `${prefix}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      names.push(...collectBundleFiles(path.join(dir, dirent.name), relative));
    } else if (dirent.isFile()) {
      names.push(relative);
    }
  }
  return names.sort();
}

function fail(errors) {
  for (const error of errors) console.error(`[facebook-bundle] ERROR: ${error}`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const names = collectBundleFiles(sourceDir);
  const nameErrors = validateBundleEntryNames(names);
  if (nameErrors.length > 0) fail(nameErrors);

  const entries = names.map((name) => ({
    name,
    data: readFileSync(path.join(sourceDir, ...name.split('/'))),
  }));
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]));

  const contentErrors = [
    ...validateEntryHtml(byName.get('index.html').toString('utf8')),
    ...(() => {
      try {
        return validateFbappConfig(JSON.parse(byName.get('fbapp-config.json').toString('utf8')));
      } catch (err) {
        return [`fbapp-config.json is not valid JSON: ${err.message}`];
      }
    })(),
  ];
  if (contentErrors.length > 0) fail(contentErrors);

  const zip = createStoreZip(entries);
  const size = evaluateBundleSize(zip.length);
  for (const warning of size.warnings) console.warn(`[facebook-bundle] WARNING: ${warning}`);
  if (size.errors.length > 0) fail(size.errors);

  const version = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
  mkdirSync(args.outDir, { recursive: true });
  const zipPath = path.join(args.outDir, `cryptic-realm-instant-games-v${version}.zip`);
  writeFileSync(zipPath, zip);

  console.log(`[facebook-bundle] wrote ${zipPath}`);
  console.log(`[facebook-bundle] entries: ${names.join(', ')}`);
  console.log(
    `[facebook-bundle] size: ${zip.length} bytes ` +
      `(limit ${MAX_BUNDLE_BYTES}, recommended initial ${RECOMMENDED_INITIAL_BUNDLE_BYTES})`,
  );
  console.log('[facebook-bundle] PASS');
}

main();
