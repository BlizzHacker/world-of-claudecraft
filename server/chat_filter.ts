// Pure, host-agnostic chat profanity/slur filtering. No SQL, no DOM — the SQL
// layer lives in chat_filter_db.ts and the wiring in game.ts. Two tiers:
//
//   - "soft" words (everyday swearing): cosmetic only. The server ships the
//     normalized soft list to each client in `hello`; the client masks matches
//     locally *iff* the player's profanity filter is on. The server itself
//     never alters soft words, so toggling the filter off shows raw text.
//   - "hard" words (slurs): enforced server-side and non-bypassable. A message
//     containing one is blocked entirely and the sender is warned, then
//     escalated to timed, account-wide chat mutes (see `escalate`).
//
// Matching folds common leet/confusable substitutions so "n1gg3r"-style evasion
// still resolves to the underlying word.
//
// The hard tier has TWO layers, OR'd together:
//   1. An always-on baseline built on `obscenity` — the same library `auth.ts`
//      uses to screen names. Its English dataset (which lives in the dependency,
//      NOT in this repo) folds leet/confusables/spacing AND affixes, so leetspeak,
//      diacritics, and suffixed forms all resolve to the underlying slur, while
//      still passing the Scunthorpe trap ("despicable", "classy pass"). This
//      layer is non-disableable.
//   2. The admin-editable hard list, matched per-token (see `tokenMatchesHard`).
//      It covers slurs the baseline dataset misses and any custom terms an
//      operator adds. Whole-token matching keeps it from snagging innocent words.
// This OR layering mirrors `offensiveName` in auth.ts.
//
// NOTE: this is open-source. The repo intentionally ships NO plaintext slur
// list — the actual offensive wordlist is the `obscenity` dependency's dataset.
// Operators seed extra hard words (the few the dataset omits) privately via the
// CHAT_FILTER_HARD_LIST / CHAT_FILTER_HARD_FILE env vars (see chat_filter_db.ts)
// and manage them thereafter from the admin dashboard.

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

// Built once at module load (the constructor compiles the dataset to a regex).
const builtinSlurMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * The canonical built-in slur `text` hits via the always-on `obscenity`
 * baseline, or null. Returns the dataset's canonical spelling for the matched
 * term (so an affixed/obfuscated input still logs as a stable term).
 */
export function findBuiltinSlur(text: string): string | null {
  // Scan the raw text and a de-obfuscated copy: obscenity does its own folding,
  // but it misses diacritics and a few leet glyphs that `foldConfusables` flattens.
  return matchBuiltinSlur(text) ?? matchBuiltinSlur(foldConfusables(text));
}

function matchBuiltinSlur(text: string): string | null {
  const matches = builtinSlurMatcher.getAllMatches(text, true);
  if (matches.length === 0) return null;
  const meta = englishDataset.getPayloadWithPhraseMetadata(matches[0]);
  return (
    meta.phraseMetadata?.originalWord ??
    text.slice(matches[0].startIndex, matches[0].endIndex + 1).toLowerCase()
  );
}

const CONFUSABLE_CHARS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '6': 'g',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '!': 'i',
  '|': 'i',
  '@': 'a',
  '$': 's',
  '+': 't',
  '©': 'c',
  '€': 'e',
  '£': 'l',
};

const CONFUSABLE_RE = /[0-9!|@$+©€£]/g;

// Tokens we scan: any Unicode letter/mark/number plus the leet punctuation that
// folds into letters. Unicode-aware so accented/styled glyphs (î, ⓖ, 𝓰, ｇ) stay
// inside one token rather than splitting an evasion apart. Else = separator.
const TOKEN_RE = /[\p{L}\p{M}\p{N}_@$!|+©€£]+/gu;

/**
 * Fold text toward its comparable ASCII core *without* dropping separators:
 * Unicode-decompose (NFKD — so fullwidth ｇ, circled ⓖ, math 𝓰, and ligatures
 * resolve), strip combining diacritics (î→i, é→e), lowercase, then map
 * leet/confusable glyphs to letters. This is what the obscenity baseline scans
 * a copy of, so "nî99er" / "ni66@" de-obfuscate to the underlying slur.
 */
export function foldConfusables(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(CONFUSABLE_RE, (ch) => CONFUSABLE_CHARS[ch] ?? ch);
}

/** Fold a token to its comparable core: de-leet/deburr, then strip non-letters. */
export function normalizeWord(term: string): string {
  return foldConfusables(term).replace(/[^a-z]/g, '');
}

/** Split a raw blob (newline / comma / space separated) into normalized terms. */
export function parseWordList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => normalizeWord(t))
    .filter((t) => t.length > 0);
}

// Soft tier: generous substring match (cosmetic, so "shitty" → masked is fine).
function tokenMatchesSoft(normalizedToken: string, terms: readonly string[]): boolean {
  return normalizedToken.length > 0 && terms.some((term) => normalizedToken.includes(term));
}

/**
 * Mask every token matching a soft term with asterisks. Used client-side for
 * the display filter and never on the server's broadcast path.
 */
export function maskText(text: string, terms: readonly string[]): string {
  if (terms.length === 0) return text;
  return text.replace(TOKEN_RE, (tok) =>
    tokenMatchesSoft(normalizeWord(tok), terms) ? '*'.repeat(tok.length) : tok,
  );
}

// Hard tier: strict whole-token equality (plus a stripped trailing plural "s"),
// NOT substring. Substring matching on a *punitive* list is unacceptable — it
// would auto-mute "despicable" for containing "spic" or "class" for "ass". The
// cost of a miss here is small (human reports + admins extend the list); the
// cost of a false positive is muting an innocent player.
function tokenMatchesHard(normalizedToken: string, terms: readonly string[]): boolean {
  if (normalizedToken.length === 0) return false;
  const singular = normalizedToken.endsWith('s') ? normalizedToken.slice(0, -1) : normalizedToken;
  return terms.some((term) => normalizedToken === term || singular === term);
}

/**
 * First hard term a message hits, or null. The match drives enforcement.
 * Checks the admin-editable list first, then falls through to the always-on
 * `obscenity` baseline — so an empty or incomplete hard list never opens a hole.
 */
export function findHardWord(text: string, terms: readonly string[]): string | null {
  const tokens = text.match(TOKEN_RE);
  if (tokens) {
    for (const tok of tokens) {
      const normalized = normalizeWord(tok);
      if (tokenMatchesHard(normalized, terms)) {
        // Return the configured term that fired, for the incident log.
        const singular = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
        return terms.find((term) => normalized === term || singular === term) ?? normalized;
      }
    }
  }
  return findBuiltinSlur(text);
}

// -------------------------------------------------------------------------
// Escalation: warnings, then a ladder of timed account-wide chat mutes.
// -------------------------------------------------------------------------

export interface EscalationConfig {
  /** Free passes (warning only) before the first mute. */
  warningsBeforeMute: number;
  /** Mute durations in seconds for the 1st, 2nd, … mute. The last entry caps. */
  muteLadderSeconds: number[];
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  warningsBeforeMute: 1,
  muteLadderSeconds: [10 * 60, 60 * 60, 24 * 60 * 60], // 10m → 1h → 24h
};

export interface EscalationOutcome {
  kind: 'warning' | 'mute';
  /** Mute length in seconds; 0 for a warning. */
  muteSeconds: number;
  /** The sender's new strike total after this offense. */
  strikes: number;
}

/**
 * Given the sender's previous strike count, decide what this offense earns.
 * Strikes are 1-based: the Nth hard-word offense is strike N. The first
 * `warningsBeforeMute` offenses are warnings; the rest walk the mute ladder,
 * clamping at its final (longest) entry.
 */
export function escalate(previousStrikes: number, cfg: EscalationConfig): EscalationOutcome {
  const strikes = previousStrikes + 1;
  const ladder = cfg.muteLadderSeconds;
  if (strikes <= cfg.warningsBeforeMute || ladder.length === 0) {
    return { kind: 'warning', muteSeconds: 0, strikes };
  }
  const idx = Math.min(strikes - cfg.warningsBeforeMute - 1, ladder.length - 1);
  return { kind: 'mute', muteSeconds: Math.max(0, Math.floor(ladder[idx])), strikes };
}

/** Sanitize an escalation config coming from the DB / admin input. */
export function cleanEscalationConfig(input: {
  warningsBeforeMute?: unknown;
  muteLadderSeconds?: unknown;
}): EscalationConfig {
  const warnings = Number(input.warningsBeforeMute);
  const ladderRaw = Array.isArray(input.muteLadderSeconds) ? input.muteLadderSeconds : [];
  const ladder = ladderRaw
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n > 0);
  return {
    warningsBeforeMute: Number.isFinite(warnings) && warnings >= 0 ? Math.floor(warnings) : DEFAULT_ESCALATION.warningsBeforeMute,
    muteLadderSeconds: ladder.length > 0 ? ladder : [...DEFAULT_ESCALATION.muteLadderSeconds],
  };
}

// -------------------------------------------------------------------------
// Built-in seed lists ("sensible starting points"). Admins edit the live lists
// from the dashboard; these only seed an empty table on first boot. Kept short
// and unambiguous — the hard list especially, since it carries punitive weight.
// -------------------------------------------------------------------------

export const DEFAULT_SOFT_WORDS: string[] = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'cunt',
  'dick',
  'piss',
  'asshole',
  'dumbass',
  'douche',
  'wanker',
  'bollocks',
  'prick',
  'slut',
  'whore',
];

// Slur seed list — intentionally EMPTY in this open-source repo. The always-on
// `obscenity` baseline (its dataset ships in the dependency) enforces slurs out
// of the box. The handful of slurs that dataset omits are seeded privately by
// the operator via CHAT_FILTER_HARD_LIST / CHAT_FILTER_HARD_FILE (see
// chat_filter_db.ts), then managed from the admin dashboard. Do NOT commit
// slurs here.
export const DEFAULT_HARD_WORDS: string[] = [];

/** A live snapshot of the filter state, loaded from the DB and cached. */
export interface ChatFilterState {
  soft: string[];
  hard: string[];
  config: EscalationConfig;
}

/**
 * Holds the loaded word lists + escalation config and exposes the operations
 * the server needs. The GameServer owns one instance and refreshes it from the
 * DB at boot and whenever an admin edits the lists.
 */
export class ChatFilter {
  private state: ChatFilterState = { soft: [], hard: [], config: DEFAULT_ESCALATION };

  load(state: ChatFilterState): void {
    this.state = {
      soft: [...state.soft],
      hard: [...state.hard],
      config: cleanEscalationConfig(state.config),
    };
  }

  /** Normalized soft terms shipped to clients for local masking. */
  softWords(): string[] {
    return [...this.state.soft];
  }

  config(): EscalationConfig {
    return this.state.config;
  }

  /** The first hard term `text` hits, or null. */
  findHardHit(text: string): string | null {
    return findHardWord(text, this.state.hard);
  }

  /** Decide the outcome for a sender who has `previousStrikes` prior offenses. */
  escalate(previousStrikes: number): EscalationOutcome {
    return escalate(previousStrikes, this.state.config);
  }
}
