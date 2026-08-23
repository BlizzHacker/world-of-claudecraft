// Validates and stages the Meta Quest (Horizon Store) PWA package inputs.
// The Quest lane mirrors the Xbox hosted-web-app lane (build_xbox_msix.mjs):
// a thin store shell over the live site, here as a PWA APK built with Meta's
// bubblewrap fork. This script is deliberately headless-safe: it validates
// public/manifest.webmanifest and meta/twa-manifest.json against the Horizon
// requirements (pure rules in lib/meta_pwa_validate.mjs, pinned by
// tests/meta_pwa_validate.test.ts), stages the inputs under
// release/meta-quest/stage/, and prints the packaging + upload commands.
// The APK build itself needs a JDK + Android SDK + the signing keystore, so
// it runs where those live; full runbook: docs/meta-quest-release.md.
//
// Usage: node scripts/build_meta_pwa.mjs
// Output: release/meta-quest/stage/ (validated inputs + next-step commands)

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crossCheckTwaManifest, validateMetaPwaManifest } from './lib/meta_pwa_validate.mjs';

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = resolve(workspace, 'release', 'meta-quest');
const stageRoot = resolve(releaseRoot, 'stage');

const EXPECTED_PACKAGE_ID = 'com.crypticrealm.quest';
// The SSO host the realm login navigates to; without a trusted-origin listing
// (plus its assetlinks.json) it renders under the 2D PWA custom tab bar.
const EXPECTED_TRUSTED_ORIGINS = ['authentik.moveweight.com'];

function assertReleasePath(path) {
  const prefix = `${releaseRoot}${sep}`;
  if (!path.startsWith(prefix) && path !== releaseRoot) {
    throw new Error(`Refusing to write outside ${releaseRoot}`);
  }
}

function resetDirectory(path) {
  assertReleasePath(path);
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function report(label, result) {
  for (const error of result.errors) console.error(`ERROR [${label}]: ${error}`);
  for (const warning of result.warnings) console.warn(`warn  [${label}]: ${warning}`);
  return result.errors.length;
}

const webManifestPath = resolve(workspace, 'public', 'manifest.webmanifest');
const twaManifestPath = resolve(workspace, 'meta', 'twa-manifest.json');
const assetlinksTemplatePath = resolve(workspace, 'meta', 'assetlinks.template.json');

const webManifest = readJson(webManifestPath);
const twaManifest = readJson(twaManifestPath);
const pkg = readJson(resolve(workspace, 'package.json'));

let errorCount = 0;
errorCount += report(
  'public/manifest.webmanifest',
  validateMetaPwaManifest(webManifest, { expectedTrustedOrigins: EXPECTED_TRUSTED_ORIGINS }),
);
errorCount += report(
  'meta/twa-manifest.json',
  crossCheckTwaManifest(twaManifest, {
    webManifest,
    expectedPackageId: EXPECTED_PACKAGE_ID,
    expectedVersionName: pkg.version,
  }),
);

// Non-blocking readiness probes for the machine-local pieces.
const keystorePath = resolve(workspace, twaManifest.signingKey?.path ?? 'meta/keys/missing');
if (!existsSync(keystorePath)) {
  console.warn(
    `warn  [signing]: keystore not present at ${keystorePath} (expected on a dev box; ` +
      'generate once via the runbook and never commit it)',
  );
}
const wellKnownPath = resolve(workspace, 'public', '.well-known', 'assetlinks.json');
if (!existsSync(wellKnownPath)) {
  console.warn(
    'warn  [assetlinks]: public/.well-known/assetlinks.json not committed yet; ' +
      'fill meta/assetlinks.template.json with the keystore SHA-256 and add it ' +
      '(required before store review; see docs/meta-quest-release.md)',
  );
}

if (errorCount > 0) {
  console.error(`\nMeta PWA validation FAILED with ${errorCount} error(s); nothing staged.`);
  process.exit(1);
}

mkdirSync(releaseRoot, { recursive: true });
resetDirectory(stageRoot);
copyFileSync(webManifestPath, resolve(stageRoot, 'manifest.webmanifest'));
copyFileSync(twaManifestPath, resolve(stageRoot, 'twa-manifest.json'));
copyFileSync(assetlinksTemplatePath, resolve(stageRoot, 'assetlinks.template.json'));

console.log(`\nValidated inputs staged: ${stageRoot}`);
console.log(
  `Package identity: ${twaManifest.packageId} v${twaManifest.appVersionName} (code ${twaManifest.appVersionCode})`,
);
console.log('\nNext steps (JDK 17 + Android SDK box; full runbook: docs/meta-quest-release.md):');
console.log('  1. npm install -g @meta-quest/bubblewrap-cli');
console.log('  2. Copy meta/twa-manifest.json into a working dir; bubblewrap build');
console.log('     (first run walks JDK/SDK setup and asks for the keystore passwords)');
console.log('  3. Sideload: adb install app-release-signed.apk (Quest in developer mode)');
console.log('  4. Upload to the Horizon Store release channel (replace placeholders):');
console.log('     ovr-platform-util upload-quest-build --app-id <HORIZON_APP_ID> \\');
console.log('       --apk app-release-signed.apk --channel ALPHA \\');
console.log('       --token <PARTNER_TOKEN_OR_USE_LOGIN>');
