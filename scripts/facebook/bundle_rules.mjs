// Facebook Instant Games bundle rules, kept as pure data + validators so both
// the build script (scripts/build_facebook_bundle.mjs) and the vitest
// (tests/facebook_bundle.test.ts) share one source of truth. Limits and file
// requirements come from the live docs (checked 2026-08):
// - https://developers.facebook.com/documentation/games/launch/upload-bundle
//   (index.html and fbapp-config.json at the zip root, 200 MB maximum)
// - https://developers.facebook.com/documentation/games/build/overview
//   (keep the initial bundle under 5 MB for fast load times)
// - https://developers.facebook.com/documentation/games/build/quick-start
//   (fbinstant 8.0 script URL and the init/progress/start lifecycle)

export const MAX_BUNDLE_BYTES = 200 * 1024 * 1024;
export const RECOMMENDED_INITIAL_BUNDLE_BYTES = 5 * 1024 * 1024;
export const FBINSTANT_SDK_URL = 'https://connect.facebook.net/en_US/fbinstant.8.0.js';
export const REQUIRED_ROOT_FILES = ['index.html', 'fbapp-config.json'];

const ORIENTATIONS = ['LANDSCAPE', 'PORTRAIT'];
const NAVIGATION_MENU_VERSIONS = ['NAV_FLOATING', 'NAV_BAR'];
const KNOWN_INSTANT_GAMES_KEYS = [
  'platform_version',
  'orientation',
  'override_web_orientation',
  'navigation_menu_version',
  'custom_update_templates',
  'match_player_config',
  'surfaceable_stats',
];

/** Validate a parsed fbapp-config.json. Returns a list of problems (empty = ok). */
export function validateFbappConfig(config) {
  const errors = [];
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return ['fbapp-config.json must be a JSON object'];
  }
  const instant = config.instant_games;
  if (typeof instant !== 'object' || instant === null || Array.isArray(instant)) {
    return ['fbapp-config.json must contain an "instant_games" object'];
  }
  if (instant.platform_version !== 'RICH_GAMEPLAY') {
    errors.push('instant_games.platform_version must be "RICH_GAMEPLAY"');
  }
  for (const key of ['orientation', 'override_web_orientation']) {
    if (instant[key] !== undefined && !ORIENTATIONS.includes(instant[key])) {
      errors.push(`instant_games.${key} must be one of ${ORIENTATIONS.join(', ')}`);
    }
  }
  if (
    instant.navigation_menu_version !== undefined &&
    !NAVIGATION_MENU_VERSIONS.includes(instant.navigation_menu_version)
  ) {
    errors.push(
      `instant_games.navigation_menu_version must be one of ${NAVIGATION_MENU_VERSIONS.join(', ')}`,
    );
  }
  for (const key of Object.keys(instant)) {
    if (!KNOWN_INSTANT_GAMES_KEYS.includes(key)) {
      errors.push(`instant_games has an unknown key: ${key}`);
    }
  }
  return errors;
}

/** Validate the entry html carries the SDK include and the full lifecycle. */
export function validateEntryHtml(html) {
  const errors = [];
  if (typeof html !== 'string' || html.length === 0) return ['index.html is empty'];
  if (!html.includes(FBINSTANT_SDK_URL)) {
    errors.push(`index.html must load the FBInstant SDK from ${FBINSTANT_SDK_URL}`);
  }
  for (const call of ['initializeAsync', 'setLoadingProgress', 'startGameAsync']) {
    if (!html.includes(call)) errors.push(`index.html must call FBInstant.${call}`);
  }
  return errors;
}

/** Validate the zip-relative entry names for a bundle. */
export function validateBundleEntryNames(names) {
  const errors = [];
  for (const required of REQUIRED_ROOT_FILES) {
    if (!names.includes(required)) {
      errors.push(`bundle must contain ${required} at the zip root`);
    }
  }
  for (const name of names) {
    if (name.includes('\\')) errors.push(`entry name uses backslashes: ${name}`);
    if (name.startsWith('/')) errors.push(`entry name is absolute: ${name}`);
    if (name.split('/').includes('..')) errors.push(`entry name escapes the root: ${name}`);
  }
  return errors;
}

/** Size verdict: errors block the build, warnings only print. */
export function evaluateBundleSize(totalBytes) {
  const errors = [];
  const warnings = [];
  if (totalBytes > MAX_BUNDLE_BYTES) {
    errors.push(
      `bundle is ${totalBytes} bytes, above the ${MAX_BUNDLE_BYTES} byte Facebook maximum`,
    );
  } else if (totalBytes > RECOMMENDED_INITIAL_BUNDLE_BYTES) {
    warnings.push(
      `bundle is ${totalBytes} bytes, above the ${RECOMMENDED_INITIAL_BUNDLE_BYTES} byte ` +
        'recommended initial size; players will wait longer on the Facebook loading screen',
    );
  }
  return { errors, warnings };
}
