// Facebook "Must Not Call Private APIs" guard for the Instant Games bundle.
//
// Facebook's Web Hosting upload validator statically greps the bundle text for
// member accesses on its SDK globals (FBInstant.*, and the legacy FB.* SDK
// global) and rejects the upload when it sees anything outside the public
// surface. That net also catches ACCIDENTAL literals: the v2 bundle was
// rejected because the minifier happened to name a hud-chunk local `FB`
// (shipping the text `FB.main` / `FB[e]`), and a vendor user-agent regex
// literally contains `FB[` (`/FB[AS]V\//`, the Facebook in-app browser UA).
//
// Two pure tools, shared by scripts/build_facebook_bundle.mjs and
// tests/facebook_bundle.test.ts:
// - sanitizeFacebookCollisions: parser-based (rolldown/utils parseSync),
//   semantics-preserving rewrite of a built JS file so the flagged literals
//   never appear: identifier `FB` is alpha-renamed to an unused name, and
//   `FB` inside string/template/regex literals or comments has its `B`
//   escaped (`FB`, same runtime value).
// - auditFacebookSurface: the gate the packager runs over every text entry;
//   any remaining FB member access, or an FBInstant member outside the
//   public 8.0 API, fails the build loudly.

import { parseSync } from 'rolldown/utils';

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
  if (!/\bFB\s*[.[]/.test(code)) return code;
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
