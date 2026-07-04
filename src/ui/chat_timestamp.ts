// Chat timestamps — a classic-style "Show Timestamps" interface option.
//
// Pure, DOM-free formatting helpers (snapshot-tested in tests/). The HUD owns
// the on/off + clock-format state and persists it to localStorage; this module
// just turns a wall-clock `Date` into the bracketed prefix shown on chat lines.
// Wall-clock time is fine here — the determinism ban is sim-only.

import { formatDateTime, type SupportedLanguage } from './i18n';

export type ChatClock = '12h' | '24h';

export const CHAT_CLOCKS: readonly ChatClock[] = ['12h', '24h'];

// Coerce arbitrary localStorage junk back to a valid clock (default 24h).
export function clampChatClock(v: string | null): ChatClock {
  return v === '12h' ? '12h' : '24h';
}

// Format `d` as the bracketed prefix, e.g. "[14:32]" (24h) or "[2:32 PM]" (12h).
// The time itself routes through formatDateTime so the hour cycle, day-period
// marker, and digits follow the active locale (the optional `lang` lets
// callers/tests pin one); the surrounding [] brackets are structural.
export function formatChatTimestamp(d: Date, clock: ChatClock, lang?: SupportedLanguage): string {
  const options: Intl.DateTimeFormatOptions =
    clock === '12h'
      ? { hour: 'numeric', minute: '2-digit', hour12: true }
      : { hour: '2-digit', minute: '2-digit', hour12: false };
  const out = formatDateTime(d, options, lang);
  // Normalize Intl's midnight "24:xx" (hour12:false) to "00:xx" in 24h mode.
  return `[${clock === '24h' ? out.replace(/^24:/, '00:') : out}]`;
}
