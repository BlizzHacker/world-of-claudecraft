// Pure validation for the Meta Quest PWA lane (docs/meta-quest-release.md).
// Checks the live web app manifest and the checked-in bubblewrap project
// config (meta/twa-manifest.json) against the Meta Horizon OS PWA
// requirements; scripts/build_meta_pwa.mjs is the thin IO orchestrator.
// Sources for the rules, mirrored in the runbook:
// - https://developers.meta.com/horizon/documentation/web/pwa-packaging/
//   (bubblewrap --metaquest flow, package identity must stay constant,
//    signing key + assetlinks.json, 512px-or-larger app icon)
// - https://developers.meta.com/horizon/documentation/web/pwa-overview-gs/
//   (required manifest fields, scope/start_url containment,
//    additional_trusted_origins for multi-origin 2D apps)
// - https://developers.meta.com/horizon/documentation/web/pwa-2d-support/
//   (out-of-scope navigation falls to the custom tab bar)

// Display modes Meta documents for packaged PWAs; 'browser' defeats the
// standalone panel and is treated as missing.
const PACKAGED_DISPLAY_MODES = ['fullscreen', 'standalone', 'minimal-ui'];

export const META_MIN_ICON_PX = 512;

// Largest square edge an icon entry declares ('any' counts as satisfying every
// size). sizes is space-separated WxH tokens per the manifest spec.
export function iconMaxEdge(icon) {
  const sizes = typeof icon?.sizes === 'string' ? icon.sizes.trim() : '';
  if (sizes === '') return 0;
  let max = 0;
  for (const token of sizes.split(/\s+/)) {
    if (token.toLowerCase() === 'any') return Number.POSITIVE_INFINITY;
    const match = /^(\d+)x(\d+)$/i.exec(token);
    if (!match) continue;
    const edge = Math.min(Number(match[1]), Number(match[2]));
    if (edge > max) max = edge;
  }
  return max;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// Validates the standards-based web app manifest against what the Horizon
// packaging flow needs. Returns { errors, warnings }: errors block packaging,
// warnings are store-quality gaps the runbook explains.
export function validateMetaPwaManifest(manifest, opts = {}) {
  const errors = [];
  const warnings = [];
  const expectedTrustedOrigins = opts.expectedTrustedOrigins ?? [];
  if (manifest === null || typeof manifest !== 'object') {
    return { errors: ['manifest is not a JSON object'], warnings };
  }

  for (const field of ['name', 'short_name', 'start_url']) {
    if (!isNonEmptyString(manifest[field])) errors.push(`missing required field: ${field}`);
  }

  if (!isNonEmptyString(manifest.display)) {
    errors.push('missing required field: display');
  } else if (!PACKAGED_DISPLAY_MODES.includes(manifest.display)) {
    errors.push(
      `display must be one of ${PACKAGED_DISPLAY_MODES.join(', ')} for a packaged PWA ` +
        `(got: ${manifest.display})`,
    );
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  if (icons.length === 0) {
    errors.push('missing required field: icons');
  } else if (!icons.some((icon) => iconMaxEdge(icon) >= META_MIN_ICON_PX)) {
    errors.push(`no icon of ${META_MIN_ICON_PX}x${META_MIN_ICON_PX} or larger (store app icon)`);
  }

  if (!isNonEmptyString(manifest.scope)) {
    warnings.push('no scope: bubblewrap derives one, set it explicitly to pin in-scope URLs');
  } else if (
    isNonEmptyString(manifest.start_url) &&
    !String(manifest.start_url).startsWith(String(manifest.scope))
  ) {
    errors.push(`start_url (${manifest.start_url}) is outside scope (${manifest.scope})`);
  }

  if (!isNonEmptyString(manifest.orientation)) {
    warnings.push('no orientation: the game is landscape, declare it so the panel opens wide');
  }
  if (!isNonEmptyString(manifest.id)) {
    warnings.push('no id field: add a stable id so the installed identity survives URL changes');
  }
  for (const field of ['theme_color', 'background_color']) {
    if (!isNonEmptyString(manifest[field])) warnings.push(`no ${field}: panel chrome falls back`);
  }
  if (!icons.some((icon) => String(icon?.purpose ?? '').includes('maskable'))) {
    warnings.push('no maskable icon: Horizon launcher tiles may letterbox the any-purpose icon');
  }

  const declaredOrigins = Array.isArray(manifest.additional_trusted_origins)
    ? manifest.additional_trusted_origins.map(String)
    : [];
  for (const origin of expectedTrustedOrigins) {
    if (!declaredOrigins.some((declared) => declared.includes(origin))) {
      warnings.push(
        `cross-origin host ${origin} is not in additional_trusted_origins: ` +
          'navigation there falls out of scope (custom tab bar); listing it also requires ' +
          `hosting /.well-known/assetlinks.json on ${origin}`,
      );
    }
  }

  return { errors, warnings };
}

// Deterministic, monotonic Android versionCode from the repo semver
// ('0.35.1-cr.1' -> 35001). Pre-release tags are ignored on purpose: only the
// released triple orders store uploads.
export function androidVersionCode(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(version));
  if (!match) throw new Error(`cannot derive an Android versionCode from: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (minor > 999 || patch > 999) {
    throw new Error(`versionCode derivation needs minor/patch under 1000: ${version}`);
  }
  return major * 1_000_000 + minor * 1_000 + patch;
}

// Cross-checks the checked-in bubblewrap project config against the live web
// manifest and the repo version. The package identity rule is the load-bearing
// one: the Horizon Store keys the product on packageId + signing key, so a
// drifted packageId is an error, never a warning.
export function crossCheckTwaManifest(twa, opts) {
  const errors = [];
  const warnings = [];
  const { webManifest, expectedPackageId, expectedVersionName } = opts;
  if (twa === null || typeof twa !== 'object') {
    return { errors: ['twa-manifest is not a JSON object'], warnings };
  }

  if (twa.packageId !== expectedPackageId) {
    errors.push(
      `packageId must stay ${expectedPackageId} (got: ${twa.packageId}); ` +
        'the Horizon Store product is keyed on it',
    );
  }
  if (twa.isMetaQuest !== true) {
    errors.push('isMetaQuest must be true (bubblewrap init --metaquest sets it)');
  }
  if (!isNonEmptyString(twa.webManifestUrl) || !twa.webManifestUrl.startsWith('https://')) {
    errors.push('webManifestUrl must be the https URL of the live manifest');
  }
  if (!isNonEmptyString(twa.host)) {
    errors.push('host is required (the origin the package wraps)');
  }
  const signing = twa.signingKey;
  if (!isNonEmptyString(signing?.path) || !isNonEmptyString(signing?.alias)) {
    errors.push('signingKey.path and signingKey.alias are required (updates must re-sign)');
  }
  if (!Number.isInteger(twa.appVersionCode) || twa.appVersionCode <= 0) {
    errors.push('appVersionCode must be a positive integer');
  }

  if (expectedVersionName !== undefined && twa.appVersionName !== expectedVersionName) {
    warnings.push(
      `appVersionName (${twa.appVersionName}) drifted from the repo version ` +
        `(${expectedVersionName}); sync it before uploading`,
    );
  }
  if (
    expectedVersionName !== undefined &&
    Number.isInteger(twa.appVersionCode) &&
    twa.appVersionCode !== androidVersionCode(expectedVersionName)
  ) {
    warnings.push(
      `appVersionCode (${twa.appVersionCode}) is not the derived code ` +
        `(${androidVersionCode(expectedVersionName)}) for ${expectedVersionName}`,
    );
  }
  if (webManifest && isNonEmptyString(webManifest.orientation)) {
    if (twa.orientation !== webManifest.orientation) {
      warnings.push(
        `orientation (${twa.orientation}) differs from the web manifest ` +
          `(${webManifest.orientation})`,
      );
    }
  }

  return { errors, warnings };
}
