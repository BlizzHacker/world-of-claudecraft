// Facebook "Must Not Call Private APIs" guard for the Instant Games bundle.
//
// Facebook's Web Hosting upload validator statically greps the bundle text for
// two things and rejects the upload on either: (1) member accesses on its SDK
// globals (FBInstant.*, and the legacy FB.* SDK global) outside the documented
// public surface, and (2) platform-capability bypass / sandbox-escape code that
// a game running inside the Facebook iframe has no business doing. Category (1)
// also catches ACCIDENTAL literals (the minifier naming a chunk local `FB`, a
// vendor UA regex containing `FB[`). Category (2) is what the vendor trees
// tripped: Reown/WalletConnect does `parent.postMessage` (W3mFrame iframe
// escape), reads `document.cookie`, calls `navigator.sendBeacon`, and probes
// `window.self !== window.top`; Capacitor probes `webkit.messageHandlers` /
// `androidBridge` and reads cookies. The real fix for (2) is to exclude those
// vendor trees from the Facebook build (vite.config.ts aliases them to inert
// stubs); this guard is the backstop that fails the build if any of that
// surface, or the Meta Pixel `fbq`, reappears.
//
// Two pure tools, shared by scripts/build_facebook_bundle.mjs and
// tests/facebook_bundle.test.ts:
// - sanitizeFacebookCollisions: parser-based (rolldown/utils parseSync),
//   semantics-preserving rewrite of a built JS file so the flagged literals
//   never appear: identifier `FB` is alpha-renamed to an unused name, `FB`
//   inside string/template/regex literals or comments has its `B` escaped
//   (`FB`, same runtime value), and a `.fbq` member read (Meta Pixel, always
//   undefined in the Facebook container) is renamed so the literal never ships.
// - auditFacebookSurface: the gate the packager runs over every text entry;
//   any FB.* access, any FBInstant member outside the public 8.0 API, or any
//   forbidden sandbox-escape / native-bridge / FB-endpoint pattern fails the
//   build loudly. Ordinary web navigation (window.open, location.href) and Web
//   Worker postMessage (self/worker, never parent/top/opener) are deliberately
//   NOT flagged: they are not private-API access.

import { parseSync } from 'rolldown/utils';

// The one sanctioned Facebook host reference in the bundle: the FBInstant SDK
// include in index.html. Every other connect.facebook.net / graph / dialog /
// cdn reference is forbidden.
const SANCTIONED_SDK_INCLUDE = 'https://connect.facebook.net/en_US/fbinstant.8.0.js';

// The Meta Pixel property read renamed to (an always-undefined) inert name.
const FBQ_REPLACEMENT = 'fbqUnavailable';

// Patterns that read as a sandbox escape, a native-bridge call, a direct
// Facebook endpoint, or use of a Facebook platform capability outside the
// Instant Games SDK. None has a legitimate use in the game client; each is a
// hard build failure. connect.facebook.net is checked separately so the one
// sanctioned SDK include is allowed. `window.open` and `location.*` navigation
// are intentionally absent: standard web navigation is not private-API access.
// `\??\.` in the member-access patterns tolerates optional chaining (`?.`, how
// Capacitor writes `webkit?.messageHandlers`) as well as a plain dot; the text
// grep must catch both forms.
const FORBIDDEN_PATTERNS = [
  [/\bparent\s*\??\.\s*postMessage\b/, 'parent.postMessage (iframe escape)'],
  [/\btop\s*\??\.\s*postMessage\b/, 'top.postMessage (iframe escape)'],
  [/\bopener\s*\??\.\s*postMessage\b/, 'opener.postMessage (iframe escape)'],
  [/\bwindow\s*\??\.\s*parent\b/, 'window.parent (frame access)'],
  [/\bwindow\s*\??\.\s*top\b/, 'window.top (frame access)'],
  [/\bwindow\s*\??\.\s*opener\b/, 'window.opener (frame access)'],
  [/\bframeElement\b/, 'frameElement (frame access)'],
  [/\bdocument\s*\??\.\s*domain\s*=[^=]/, 'document.domain write'],
  [/\bdocument\s*\??\.\s*cookie\b/, 'document.cookie'],
  [/\bnavigator\s*\??\.\s*sendBeacon\b/, 'navigator.sendBeacon'],
  [/\bserviceWorker\s*\??\.\s*register\b/, 'serviceWorker.register'],
  [/\bNotification\s*\??\.\s*requestPermission\b/, 'Notification.requestPermission'],
  [/\bwebkit\s*\??\.\s*messageHandlers\b/, 'webkit.messageHandlers (native bridge)'],
  [/\bandroidBridge\b/, 'androidBridge (native bridge)'],
  [/\bFBInstantBridge\b/, 'FBInstantBridge (private native bridge)'],
  [/\b__fbNative\b/, '__fbNative (private native bridge)'],
  [/\bMessengerExtensions\b/, 'MessengerExtensions (private bridge)'],
  [/\bIGCommands\b/, 'IGCommands (private bridge)'],
  [/\b__buffetInstance\b/, '__buffetInstance (private bridge)'],
  [
    /(?:\??\.|\bwindow\s*\??\.)\s*fbq\b|\bfbq\s*\(/,
    'fbq (Meta Pixel; use FBInstant.logEvent instead)',
  ],
  [/graph\.facebook\.com/, 'graph.facebook.com (direct Graph API)'],
  [/\bfbcdn\b/, 'fbcdn (direct Facebook CDN)'],
  [/\bm\.facebook\.com/, 'm.facebook.com (direct Facebook endpoint)'],
  [/facebook\.com\s*\/\s*dialog/, 'facebook.com/dialog (direct Facebook dialog)'],
];

// The documented FBInstant 8.0 surface (developers.facebook.com/documentation/
// games; checked 2026-08). The player.*/context.* families hang off the two
// namespace members, so the top-level names are what a member grep can see.
export const FBINSTANT_PUBLIC_API = new Set([
  'initializeAsync',
  'startGameAsync',
  'setLoadingProgress',
  'player',
  'context',
  'payments',
  'shareAsync',
  'updateAsync',
  'switchGameAsync',
  'quit',
  'logEvent',
  'onPause',
  'getLocale',
  'getPlatform',
  'getSDKVersion',
  'getSupportedAPIs',
  'getEntryPointData',
  'getEntryPointAsync',
  'setSessionData',
  'canCreateShortcutAsync',
  'createShortcutAsync',
  'matchPlayerAsync',
  'checkCanPlayerMatchAsync',
  'getLeaderboardAsync',
  'loadBannerAdAsync',
  'hideBannerAdAsync',
  'getInterstitialAdAsync',
  'getRewardedVideoAsync',
  'graphApi',
]);

const FB_ACCESS = /\bFB(Instant)?\s*([.[])/g;

/**
 * Textual scan for Facebook-global member accesses: every occurrence of
 * `FB.x`, `FB[...]`, `FBInstant.x`, `FBInstant[...]` as
 * { kind: 'FB' | 'FBInstant', member: string | null, index }. member is null
 * for computed/unquoted bracket access (which includes text that merely LOOKS
 * like one, `/FB[AS]V\//`; the upload grep cannot tell the difference either,
 * which is exactly why it must not ship). Bare occurrences with no member
 * access are not returned: probing `window.FBInstant` for existence is fine,
 * `FBInstant` there is a property name, not an access ON the SDK global.
 */
export function findFacebookGlobalTokens(text) {
  const tokens = [];
  FB_ACCESS.lastIndex = 0;
  let m = FB_ACCESS.exec(text);
  while (m !== null) {
    const kind = m[1] ? 'FBInstant' : 'FB';
    const rest = text.slice(m.index + m[0].length);
    let member = null;
    if (m[2] === '.') {
      member = rest.match(/^\s*([A-Za-z_$][\w$]*)/)?.[1] ?? null;
    } else {
      member = rest.match(/^\s*(['"])([^'"\n]*)\1/)?.[2] ?? null;
    }
    tokens.push({ kind, member, index: m.index });
    m = FB_ACCESS.exec(text);
  }
  return tokens;
}

/** The packager's gate: problems (empty = ok) for one bundle text entry. */
export function auditFacebookSurface(text, name = 'entry') {
  const errors = [];
  // (1) FB.* / FBInstant.* member accesses.
  for (const token of findFacebookGlobalTokens(text)) {
    if (token.kind === 'FB') {
      errors.push(
        `${name}: contains an FB.* member access literal at offset ${token.index} ` +
          '(Facebook rejects bundles that appear to call private SDK APIs)',
      );
    } else if (token.member === null) {
      errors.push(
        `${name}: computed or unparseable FBInstant member access at offset ${token.index}`,
      );
    } else if (!FBINSTANT_PUBLIC_API.has(token.member)) {
      errors.push(`${name}: FBInstant.${token.member} is not in the documented public API`);
    }
  }
  // (2) connect.facebook.net beyond the one sanctioned SDK include.
  const sdkIncludes = text.split(SANCTIONED_SDK_INCLUDE).length - 1;
  const connectRefs = (text.match(/connect\.facebook\.net/g) ?? []).length;
  if (connectRefs > sdkIncludes) {
    errors.push(
      `${name}: references connect.facebook.net beyond the sanctioned FBInstant SDK include`,
    );
  }
  // (3) sandbox-escape / native-bridge / direct-endpoint / platform-bypass.
  for (const [pattern, reason] of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) errors.push(`${name}: forbidden pattern ${reason}`);
  }
  return errors;
}

// --- parser-based sanitizer ------------------------------------------------

function walkWithParents(node, parents, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkWithParents(child, parents, visit);
    return;
  }
  const typed = typeof node.type === 'string';
  if (typed) visit(node, parents);
  if (typed) parents.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    walkWithParents(value, parents, visit);
  }
  if (typed) parents.pop();
}

function freshName(code) {
  for (let i = 0; i < 1000; i += 1) {
    const name = `Fb_${i.toString(36)}`;
    if (!new RegExp(`\\b${name}\\b`).test(code)) return name;
  }
  throw new Error('facebook private-api guard: could not find an unused identifier name');
}

// Neutralize `FB` immediately followed by `.` or `[` inside a literal span by
// escaping the B (`FB`): identical runtime value for strings, template
// text, and regex sources alike. Throws when the F sits right after a \u/\x
// escape introducer, where the letters are hex digits and rewriting them
// would corrupt the escape; that case needs a human, not a silent skip.
function escapeLiteralSpan(raw, spanStart, spanName) {
  const edits = [];
  const re = /FB(?=\s*[.[])/g;
  let m = re.exec(raw);
  while (m !== null) {
    const before = raw.slice(Math.max(0, m.index - 2), m.index);
    if (/\\[ux]$/.test(before) || /\\u\{?[0-9a-fA-F]*$/.test(before)) {
      throw new Error(
        `facebook private-api guard: "FB" inside an escape sequence in ${spanName}; ` +
          'refusing to rewrite automatically',
      );
    }
    edits.push({ start: spanStart + m.index + 1, end: spanStart + m.index + 2, text: '\\u0042' });
    m = re.exec(raw);
  }
  return edits;
}

/**
 * Rewrite one built JS file so no `FB.`/`FB[` literal survives, without
 * changing behavior. Returns the (possibly unchanged) code. Throws on any
 * shape it cannot prove safe; the packager treats that as a build failure.
 */
export function sanitizeFacebookCollisions(code, filename = 'chunk.js') {
  if (!/\bFB\s*[.[]/.test(code) && !/\bfbq\b/.test(code)) return code;
  const parsed = parseSync(filename, code);
  if (parsed.errors?.length) {
    throw new Error(
      `facebook private-api guard: ${filename} did not parse: ${parsed.errors[0]?.message ?? 'unknown error'}`,
    );
  }
  const newName = freshName(code);
  const edits = [];

  walkWithParents(parsed.program, [], (node, parents) => {
    const parent = parents[parents.length - 1];
    // Meta Pixel: rename a `.fbq` / `obj['fbq']` member read to an inert,
    // always-undefined property so the literal `fbq` never ships. Reading a
    // different absent property is behavior-identical in the Facebook
    // container, where the pixel global is never present. A bare identifier
    // `fbq` (e.g. a minified local) is left alone; the audit only flags the
    // member/call forms, so it does not false-positive on one.
    if (node.type === 'MemberExpression' && node.property) {
      if (!node.computed && node.property.type === 'Identifier' && node.property.name === 'fbq') {
        edits.push({ start: node.property.start, end: node.property.end, text: FBQ_REPLACEMENT });
      } else if (
        node.computed &&
        node.property.type === 'Literal' &&
        node.property.value === 'fbq'
      ) {
        edits.push({
          start: node.property.start,
          end: node.property.end,
          text: JSON.stringify(FBQ_REPLACEMENT),
        });
      }
    }
    if (node.type === 'Identifier' && node.name === 'FB') {
      // Non-computed member property (`x.FB`) and object/class keys named FB
      // are property names, not references; renaming them would change
      // lookups. None ship today, so refuse loudly rather than guess.
      const isMemberProp =
        parent?.type === 'MemberExpression' && !parent.computed && parent.property === node;
      const isKey =
        (parent?.type === 'Property' ||
          parent?.type === 'PropertyDefinition' ||
          parent?.type === 'MethodDefinition') &&
        !parent.computed &&
        parent.key === node;
      const isImportExportName =
        parent?.type === 'ImportSpecifier' || parent?.type === 'ExportSpecifier';
      if (isMemberProp || isKey || isImportExportName) {
        throw new Error(
          `facebook private-api guard: ${filename} uses "FB" as a property/key name; ` +
            'refusing to rewrite automatically',
        );
      }
      if (parent?.type === 'Property' && parent.shorthand) {
        throw new Error(
          `facebook private-api guard: ${filename} uses shorthand {FB}; refusing to rewrite`,
        );
      }
      edits.push({ start: node.start, end: node.end, text: newName });
      return;
    }
    if (node.type === 'Literal' || node.type === 'TemplateElement') {
      if (node.type === 'TemplateElement') {
        const grand = parents[parents.length - 2];
        if (grand?.type === 'TaggedTemplateExpression') {
          const raw = code.slice(node.start, node.end);
          if (/FB\s*[.[]/.test(raw)) {
            throw new Error(
              `facebook private-api guard: ${filename} has "FB" in a tagged template; refusing`,
            );
          }
          return;
        }
      }
      const raw = code.slice(node.start, node.end);
      if (/FB(?=\s*[.[])/.test(raw)) {
        edits.push(...escapeLiteralSpan(raw, node.start, `${filename} literal`));
      }
    }
  });

  // Comments are free text; break the token with an underscore.
  for (const comment of parsed.comments ?? []) {
    const raw = code.slice(comment.start, comment.end);
    const re = /FB(?=\s*[.[])/g;
    let m = re.exec(raw);
    while (m !== null) {
      edits.push({
        start: comment.start + m.index,
        end: comment.start + m.index + 2,
        text: 'F_B',
      });
      m = re.exec(raw);
    }
  }

  edits.sort((a, b) => b.start - a.start);
  let out = code;
  let lastStart = Number.POSITIVE_INFINITY;
  for (const edit of edits) {
    if (edit.end > lastStart) {
      throw new Error(`facebook private-api guard: overlapping edits in ${filename}`);
    }
    lastStart = edit.start;
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }

  if (/\bFB\s*[.[]/.test(out)) {
    throw new Error(
      `facebook private-api guard: ${filename} still contains an FB member literal after rewrite`,
    );
  }
  const reparsed = parseSync(filename, out);
  if (reparsed.errors?.length) {
    throw new Error(
      `facebook private-api guard: rewrite of ${filename} no longer parses: ` +
        `${reparsed.errors[0]?.message ?? 'unknown error'}`,
    );
  }
  return out;
}
