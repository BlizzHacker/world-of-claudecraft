import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cssTreeUnder } from './helpers/css_tree_under';
import { expectScansOnlyThroughSharedWalkers } from './helpers/scan_guard_self_audit';

// The chat panel's chrome must never render as browser-default chrome on the world.
//
// Regression this closes: `fix(mobile): resolve chat overlap, chatbox border, and
// pre-gameworld scroll` retired the redundant in-log reply button. It deleted the
// element from index.html AND deleted the whole `#mobile-chat-reply` CSS block from
// hud.mobile.css, including the unconditional `display: none` base rule that was the
// only thing hiding it off touch. It did NOT delete the element from play.html. The
// orphan stayed in `#chatlog-wrap`, directly under `#chatlog-frame`, with no rule in
// any sheet left to match it: on /play it painted on every viewport, desktop
// included, as a native button carrying the hydrated `chat` glyph plus the word
// "Chat" in the user-agent's own color, sitting outside the themed panel above it.
// Nothing failed, because the button is a plain `<button>`: the entry-parity guard
// next door reads `.panel` divs, and the mobile-window coverage guard reads
// `.window` / `.mt-panel` ids.
//
// So the pin is stated as the invariant rather than as a name blocklist, in three
// parts, each of which the orphan violated:
//   1. every element inside `#chatlog-wrap` carries an id or class the loaded
//      stylesheets actually name (an element no rule matches is unstyled chrome,
//      whatever it is called),
//   2. the same holds for chat chrome anywhere else in an entry (the mobile bar
//      button, the composer, the keyboard-dismiss chevron, the live region),
//   3. the two build entries carry the SAME chat panel, so retiring a piece of it
//      from one entry and not the other fails here instead of shipping.
// Part 3 catches the cause and parts 1 and 2 catch the symptom, so a stray that
// arrives some other way (a renamed class, a rule that stopped matching) is caught
// too.
const HTML_ENTRIES = ['../index.html', '../play.html'] as const;
const STYLES_DIR = '../src/styles';
const CHAT_WRAP_ID = 'chatlog-wrap';

function read(relPath: string): string {
  return readFileSync(fileURLToPath(new URL(relPath, import.meta.url)), 'utf8');
}

// The flattened cascade a game entry loads: the src/styles/index.css barrel, the
// sheets it imports, and the two per-entry .extra.css files each entry pulls in with
// a <link> (wiring pinned by tests/per_entry_css_wiring.test.ts).
//
// This read stays SINGLE-LEVEL on purpose, the same call the mobile-window coverage
// guard makes and for the same reason: it models the sheets that actually reach a
// browser, so crediting a sheet parked in a subfolder that no entry imports would be
// a false green, and a false green here means shipping the unstyled element again.
// The premise is checked rather than asserted in prose, off the same read, so the day
// src/styles grows a subdirectory this throws where the reasoning is written instead
// of quietly meaning something narrower.
function stylesText(dir: string = fileURLToPath(new URL(STYLES_DIR, import.meta.url))): string {
  const tree = cssTreeUnder(dir);
  if (tree.dirs.length > 0) {
    throw new Error(
      `src/styles gained a subdirectory (${tree.dirs.join(', ')}): re-read the note above stylesText()`,
    );
  }
  return tree.files
    .map(({ full }) => readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))
    .join('\n');
}

interface ChromeElement {
  /** Lowercased tag name, for the failure message. */
  readonly tag: string;
  /** The element's id, or the empty string when it has none. */
  readonly id: string;
  /** Class tokens on the element, in source order. */
  readonly classes: string[];
}

const stripComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

// Every opening tag in `html`, attribute-ORDER-TOLERANT (id and class are read
// independently out of the tag's attribute text, so a class-first element is picked
// up the same as an id-first one). A tag's attributes never contain a raw '>'.
function elementsIn(html: string): ChromeElement[] {
  const out: ChromeElement[] = [];
  for (const tag of html.matchAll(/<([a-z][a-z0-9]*)\s+([^>]*?)\/?>/gi)) {
    const attrs = tag[2];
    out.push({
      tag: tag[1].toLowerCase(),
      id: /\bid="([^"]+)"/.exec(attrs)?.[1] ?? '',
      classes: (/\bclass="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/).filter(Boolean),
    });
  }
  return out;
}

// The `#chatlog-wrap` subtree, comments stripped first so a commented `</div>` cannot
// throw the depth count off. Only `<div>` tags move the depth, which is enough to find
// the wrap's own close (the buttons and spans inside it nest no divs), and it is the
// same walk tests/entry_window_parity.test.ts uses for a panel block. Throws when the
// wrap is not found, so a markup rename fails loudly rather than scoping every
// assertion below to an empty string.
function chatWrapHtml(rawHtml: string): string {
  const html = stripComments(rawHtml);
  const open = new RegExp(`<div\\b[^>]*\\bid="${CHAT_WRAP_ID}"[^>]*>`).exec(html);
  if (!open) throw new Error(`#${CHAT_WRAP_ID} not found: the chat panel markup was renamed`);
  const start = open.index;
  let depth = 0;
  for (const tag of [...html.slice(start).matchAll(/<\/?div\b[^>]*>/g)]) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, start + (tag.index ?? 0) + tag[0].length);
  }
  throw new Error(`#${CHAT_WRAP_ID} never closes: the chat panel markup is unbalanced`);
}

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A selector token is NAMED by the cascade when some rule mentions it and the mention
// is the whole token, not a prefix of a longer one (`#chatlog` must not be credited to
// `#chatlog-frame`). Comments are already stripped from the corpus, so a commented rule
// cannot spoof coverage.
function namesSelector(css: string, prefix: '#' | '.', token: string): boolean {
  return new RegExp(
    `${prefix === '#' ? '#' : '\\.'}${escapeForRegExp(token)}(?![-_a-zA-Z0-9])`,
  ).test(css);
}

function isStyled(css: string, el: ChromeElement): boolean {
  if (el.id && namesSelector(css, '#', el.id)) return true;
  return el.classes.some((token) => namesSelector(css, '.', token));
}

const describeEl = (el: ChromeElement): string =>
  `<${el.tag}${el.id ? ` id="${el.id}"` : ''}${el.classes.length ? ` class="${el.classes.join(' ')}"` : ''}>`;

/** Chat chrome anywhere in an entry: the id or one class token mentions chat. */
const isChatChrome = (el: ChromeElement): boolean =>
  /chat/i.test(el.id) || el.classes.some((token) => /chat/i.test(token));

describe('chat chrome entry parity', () => {
  const css = stylesText();

  it.each(HTML_ENTRIES)('%s styles every element inside the chat panel', (entry) => {
    const inside = elementsIn(chatWrapHtml(read(entry))).slice(1);
    // Vacuity floor: the tab strip, the frame, and the two panes are always there.
    expect(inside.length).toBeGreaterThanOrEqual(4);
    // An element with neither id nor class cannot be themed by the sheets at all, so
    // it is reported the same as one no rule happens to match.
    const unstyled = inside.filter((el) => !isStyled(css, el)).map(describeEl);
    expect(
      unstyled,
      `${entry}: chat panel chrome that no src/styles rule matches renders as ` +
        'browser-default chrome on the world; give it themed chrome or retire it',
    ).toEqual([]);
  });

  it.each(HTML_ENTRIES)('%s styles every chat-chrome element it declares', (entry) => {
    const chrome = elementsIn(stripComments(read(entry))).filter(isChatChrome);
    // Vacuity floor: the live region, the panel and its parts, the composer, the
    // keyboard-dismiss chevron, and the mobile bar button.
    expect(chrome.length).toBeGreaterThanOrEqual(8);
    const unstyled = chrome.filter((el) => !isStyled(css, el)).map(describeEl);
    expect(
      unstyled,
      `${entry}: chat chrome that no src/styles rule matches; a retired control whose ` +
        'rules were deleted must be deleted from the markup too',
    ).toEqual([]);
  });

  it('index.html and play.html carry the same chat panel', () => {
    const [index, play] = HTML_ENTRIES.map((entry) => elementsIn(chatWrapHtml(read(entry))));
    const signature = (els: ChromeElement[]): string[] =>
      els.map((el) => `${el.tag}#${el.id}.${[...el.classes].sort().join('.')}`);
    expect(signature(play)).toEqual(signature(index));
  });

  it('reads the stylesheet tree only through the shared walker', () => {
    expectScansOnlyThroughSharedWalkers(import.meta.url, ['css_tree_under']);
  });
});
