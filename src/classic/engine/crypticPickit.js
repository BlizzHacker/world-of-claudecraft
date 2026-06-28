// crypticPickit.js — Diablo II-style autopickit filter for Cryptic Realm.
//
// Loads .nip files from /cryptic-assets/Pickit/, parses each rule into a
// JS predicate, and exposes pickitMatch(item) that returns the matched rule
// (or null). Game code can use this to auto-tag dropped loot.
//
// Rule format (per https://kolton.gitbook.io / standard NIP):
//   [name] == foo && [quality] == unique && [flag] != ethereal  # [stat] >= N  # [maxquantity] == 1
//
// Three sections separated by '#':
//   1. identity    — name/type/quality/flag/class equality
//   2. stats       — numeric thresholds, may include arithmetic
//   3. maxquantity — drop cap for this rule
//
// Lines starting with `//` (or with trailing `// note`) are comments.

export const CR_NIP_FILES = [
  "set", "ubers", "unique", "white",
  "crafted", "magic", "misc", "rare",
];

const NIP_BASE = "/cryptic-assets/Pickit";

// D2 quality hierarchy used for `[quality] <= superior`-style ordering.
// Identifiers not in this map rank as 0 (still equality-comparable).
const _QRANK = {
  // qualities (D2 ItemQualityType order — kept compatible with NIP semantics)
  inferior: 0, normal: 1, superior: 2, magic: 3, set: 4, rare: 5, unique: 6, crafted: 7,
  // flags
  ethereal: 1, identified: 1, runeword: 1,
  // class tiers (used by [class] == exceptional / elite)
  exceptional: 1, elite: 2,
  // truthy bare-word
  none: 0,
};

// Symbol-tagged value: supports `==` as string and `<=`/`<`/`>=`/`>` as rank
// number. JS [Symbol.toPrimitive] picks the right coercion based on context.
class _Tag {
  constructor(s) {
    this._s = String(s || "").toLowerCase();
    this._r = _QRANK[this._s] ?? 0;
  }
  [Symbol.toPrimitive](hint) {
    if (hint === "number") return this._r;
    return this._s; // "string" + "default" (== / != coerce here)
  }
  toString()  { return this._s; }
  valueOf()   { return this._r; }
}

// ─── Parser ───────────────────────────────────────────────────────────────

function _stripInlineComment(line) {
  // Strip everything from the first // onwards (NIP files have no string literals).
  const i = line.indexOf("//");
  return (i >= 0 ? line.slice(0, i) : line).trim();
}

// Translate NIP boolean expression into a JS function (s) => boolean.
//   - [stat] tokens → s("stat")
//   - bare identifiers immediately after a comparison op → quoted strings
//     (so `== ringmail` becomes `== "ringmail"`)
function _compile(expr) {
  if (!expr || !expr.trim()) return () => true;
  let t = expr;
  // [stat] → s("stat")
  t = t.replace(/\[([a-zA-Z0-9_]+)\]/g, (_, n) => `s(${JSON.stringify(n.toLowerCase())})`);
  // After a comparison op, identifier → quoted string. Skip "s" so we don't
  // re-wrap the helper. After ordering ops (<= < >= >), the comparison still
  // lands on _Tag.valueOf() (rank number) on the LHS — RHS quoted string here
  // would break ordering, so emit a rank lookup for ordering comparisons.
  t = t.replace(
    /(==|!=|<=|>=|<|>)\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
    (_match, op, ident) => {
      const lc = ident.toLowerCase();
      if (lc === "s") return _match;
      // Ordering ops compare numerically — emit the rank as a literal number.
      if (op === "<=" || op === "<" || op === ">=" || op === ">") {
        const r = _QRANK[lc] ?? 0;
        return `${op}${r}`;
      }
      // Equality ops compare as strings (matches _Tag.toString on the LHS).
      return `${op}${JSON.stringify(lc)}`;
    },
  );
  try {
    // eslint-disable-next-line no-new-func
    return new Function("s", `try { return (${t}); } catch (e) { return false; }`);
  } catch (_e) {
    return () => false;
  }
}

function _parseLine(rawLine, lineno, file) {
  const line = _stripInlineComment(rawLine);
  if (!line) return null;
  const parts = line.split("#").map(p => p.trim());
  const identity = _compile(parts[0]);
  const stats    = _compile(parts[1] || "");
  let   maxQty   = Infinity;
  const qm = (parts[2] || "").match(/\[maxquantity\]\s*==\s*(\d+)/i);
  if (qm) maxQty = parseInt(qm[1], 10);
  return {
    id:       `${file}:${lineno}`,
    file,
    raw:      line,
    matchIdentity: identity,
    matchStats:    stats,
    maxQty,
  };
}

function _parseFile(text, file) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Skip pure comment lines fast (NIP convention)
    if (!trimmed || trimmed.startsWith("//")) continue;
    const r = _parseLine(lines[i], i + 1, file);
    if (r) out.push(r);
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────

const _fileCache = new Map(); // file → rules[]
let   _allRules  = null;
let   _loadingP  = null;
let   _ruleCounts = {};       // file → count (for diagnostics / HUD)

/** Load + parse all .nip files. Idempotent — returns the cached flat list. */
export function loadPickit() {
  if (_allRules) return Promise.resolve(_allRules);
  if (_loadingP) return _loadingP;
  _loadingP = (async () => {
    const flat = [];
    await Promise.all(CR_NIP_FILES.map(async (file) => {
      try {
        const res = await fetch(`${NIP_BASE}/${file}.nip`, { cache: "force-cache" });
        if (!res.ok) {
          _fileCache.set(file, []);
          _ruleCounts[file] = 0;
          return;
        }
        const text  = await res.text();
        const rules = _parseFile(text, file);
        _fileCache.set(file, rules);
        _ruleCounts[file] = rules.length;
        flat.push(...rules);
      } catch (_e) {
        _fileCache.set(file, []);
        _ruleCounts[file] = 0;
      }
    }));
    _allRules = flat;
    if (typeof console !== "undefined") {
      console.log("[crypticPickit] loaded", flat.length, "rules across", CR_NIP_FILES.length, "files:", _ruleCounts);
    }
    return flat;
  })();
  return _loadingP;
}

export function pickitRuleCount() {
  return _allRules?.length || 0;
}

export function pickitFileCounts() {
  return { ..._ruleCounts };
}

/**
 * Build the [stat] getter for a Cryptic-Realm item descriptor.
 * Identity fields (name, type, quality, flag, class) are wrapped in _Tag so
 * both `==` and `<=` work correctly. Numeric stats are read from item.stats.
 */
function _statGetter(item) {
  const stats = item.stats || {};
  const identity = {
    name:    new _Tag(_normalizeName(item.name)),
    type:    new _Tag(item.slot || item.type || ""),
    quality: new _Tag(item.rarity?.id || item.quality || "normal"),
    flag:    new _Tag(item.flag || (item.ethereal ? "ethereal" : "")),
    class:   new _Tag(item.class || "normal"),
    sockets: Number(item.sockets || 0),
  };
  return (key) => {
    const k = String(key || "").toLowerCase();
    if (k in identity) return identity[k];
    if (k === "maxquantity") return 0; // never the predicate side
    const v = stats[k];
    if (v === undefined || v === null) return 0;
    return Number(v) || 0;
  };
}

// "Bone Helm" → "bonehelm" (NIP names have no spaces)
function _normalizeName(s) {
  return String(s || "").toLowerCase().replace(/[\s'\-_]/g, "");
}

/**
 * Match an item against the loaded ruleset.
 * Returns the first matching rule (with file + raw text) or null.
 * Stat-expression failures are tolerated: identity match alone is enough
 * since most Cryptic items don't yet carry full D2 stat lines.
 */
export function pickitMatch(item, rules = _allRules) {
  if (!item || !rules || !rules.length) return null;
  const s = _statGetter(item);
  for (const rule of rules) {
    let identityOk = false;
    try { identityOk = !!rule.matchIdentity(s); } catch (_e) { identityOk = false; }
    if (!identityOk) continue;
    let statsOk = true;
    try { statsOk = !!rule.matchStats(s); }
    catch (_e) { statsOk = true; } // tolerate complex stat expressions on lean items
    if (statsOk) return rule;
  }
  return null;
}

/**
 * Convenience: turn a matched rule into a short label for display
 * (the trailing `// note` comment in the source line, if any).
 */
export function pickitLabel(rule) {
  if (!rule) return "";
  const m = rule.raw.match(/\/\/\s*(.+)$/);
  if (m) return m[1].trim();
  // Fall back to the identity expression
  const head = rule.raw.split("#")[0].trim();
  return head.length > 60 ? head.slice(0, 57) + "..." : head;
}
