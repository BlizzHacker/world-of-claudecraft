<!-- src/ui/ — classic HUD, i18n, procedural icons. Local detail only; the
     IWorld seam, dependency rules, and "files-can-be-huge" convention are in
     root + src/ CLAUDE.md — don't repeat them here. -->

# src/ui/ — classic HUD, i18n, procedural icons

The classic-MMO HUD: unit/party frames, action bar, all windows, tooltips,
world map + minimap, combat log, floating combat text. Plus the locale table and
runtime-drawn icons.

## How this area works
- **Plain DOM + canvas, no UI framework.** The HUD queries pre-existing DOM
  (`$('#…')` → `index.html`) and builds the rest with `innerHTML` /
  `createElement`. There is no virtual DOM, reactivity, or component lib.
- **Reads from / acts through `IWorld` only** (`world_api.ts`). The HUD renders
  world state and dispatches every player action through `IWorld`; it never
  imports `Sim`/`ClientWorld` (see src/ CLAUDE.md). It also takes `Renderer` +
  out-of-band glue via `OptionsHooks`/`ReportHooks` wired by `main.ts`.
- All HTML interpolation goes through `esc()`. **Never `innerHTML` raw
  player/server text** — names, chat, guild names, etc. must pass through `esc`.

## UI/UX, mobile & accessibility standards
The HUD ships to real players on desktop **and** phones, so every visible control is
held to these — verify in mobile portrait *and* landscape before calling UI work done.
- **Aesthetic:** premium dark-fantasy theme (deep darks, gold-brown accents, rich
  borders); avoid default browser-chrome looks. **No raw emojis as in-game icons** —
  use the procedural `icons.ts` recipes (below) or real art. Transitions are smooth
  and interruption-safe (cross-fades), never causing layout shift.
- **Layout stability:** content updates must not resize the parent, jump, or clip.
  Prefer `width:100%` + `max-width` over viewport units like `92vw` (they overflow
  once margins/padding are added). Flex/grid + fluid type; no ad-hoc inline styles.
- **Mobile touch** (gate on touch capability / runtime state, not only `max-width` —
  landscape phones need it too):
  - Every visible `input`/`select`/`textarea` is **≥16px** font, or iOS Safari
    auto-zooms the page on focus.
  - Every tappable target (buttons, links, selects, tabs, icon-only controls, anything
    with `role="button"|"tab"|"option"`) is **≥40×40px**.
  - Narrow headers collapse to a hamburger drawer rather than wrapping/overflowing.
- **Accessibility (WCAG 2.1 AA):** full keyboard operation (Tab/Shift+Tab/Enter/Space);
  high-contrast `:focus-visible` on every custom interactive element; correct
  semantics / ARIA (`role`, `aria-selected`, `aria-pressed`, `aria-invalid`,
  `aria-describedby`, `tabindex`); honor `prefers-reduced-motion` (drop cross-fades,
  content translations, camera auto-rotate); **no `transform: scale()` on hover/focus**
  of list/rail/chip items (motion-sickness trigger); text contrast ≥4.5:1 (≥3:1 large).
  Accessible names are still `t()` keys (see i18n below).

## hud.ts (~5240 — one class `Hud`) — navigation map
Every region is fenced by a `// ----` banner. `update()` (~L824) is the per-frame
entry; `onEvent` paths feed log/FCT/audio/banners (~L1651). Jump by banner:
| Region | ~line |
|---|---|
| Fields / constructor / `OptionsHooks`,`ReportHooks` | 31–372 |
| Portraits, icons, tooltips, money | 373 |
| Action bar (`slotMap`, `BAR_ABILITY_SLOTS`, click/keybind dispatch) | 585 |
| Frame update (unit/target/combat state) | 821 |
| Minimap & world map (`toggleMap`, zone band) | 1119 |
| Ashen Coliseum arena panel (`toggleArena`) | 1304 |
| Events → log / FCT / audio / banners | 1651 |
| Quest dialog (gossip) · Loot · Vendor | 2252 / 2391 / 2434 |
| World Market (auction house: browse/sell/collect) | 2525 |
| Bags · Character window · Spellbook | 2752 / 2953 / 3268 |
| Confirm dialog + in-app text-input modal (replaces native `prompt`) | 3086 / 3101 |
| Talents & Specializations panel ('N', staged-edit + loadouts) | 3338 |
| Quest log · Party frames · Player context menu | 3714 / 3804 / 3858 |
| Social panel (friends/guild/ignore, online) | 4123 |
| Prompts (party/trade/duel) · Trade window | 4443 / 4465 |
| Options menu (Esc) + keybind rebinding | 4565 |
Toggle/open methods (`toggleBags`, `openVendor`, `openContextMenu`, …) are the
public surface `main.ts`/input call.

## i18n.ts (~11900) — IMPORTANT
- **Every locale object is declared `: typeof en`** (`es`, `fr_FR`, `de_DE`, …).
  `tsc` fails if any locale is missing/renames a key. **YOU MUST add a new string
  to `en` first, then to every locale object**, or the build breaks.
- `t(key)` is typed `Leaves<typeof en>` (dotted path, e.g. `t('game.xp.suffix')`)
  and falls back to the raw key if missing. `getLanguage`/`setLanguage` persist to
  `localStorage('locale')`; `?lang=` query overrides.
- The HUD is fully localized (~560 `t()` calls in hud.ts, ~16 in meters.ts);
  post-cap/XP/leaderboard text lives in `gameStrings` and routes through `t()`.
  Prefer `t()` for new user-facing strings.
- `translations` maps all 14 exported locales (en, es, es_ES, fr_FR, fr_CA, en_CA,
  it_IT, de_DE, zh_CN, zh_TW, ko_KR, ja_JP, pt_BR, ru_RU); `supportedLanguages =
  Object.keys(translations)`. Add to that map to make a new locale selectable.

## icons.ts (~1510) — procedural, no image files
Icons are composed on a canvas at runtime and cached as PNG data URLs — there are
**no icon image assets**. Public API: `iconDataUrl(kind, id, size)` where `kind`
is `'ability' | 'item' | 'aura' | 'crest'`; plus `QUALITY_COLOR`.
Each icon is a recipe: `{ bg, pal, prims, fx? }` (`IconRecipe`) drawn over a
`BACKGROUNDS` radial + `PALETTES` tint with vector `PRIMITIVES` and optional `FX`.
Unknown ids fall back via `abilityFallback`/`itemFallback` (school + name
keywords), so every id always renders.
- **Add an icon for a known id:** add an entry to `ABILITY_RECIPES` /
  `ITEM_RECIPES` / `AURA_RECIPES` / `CREST_RECIPES` using the `r(bg, pal, prims, fx?)` helper
  (e.g. `r('fire','blood',['sword','flame'])`; `TL/TR/BL/BR/BIG` are placement
  shorthands). New visuals need a new `PRIMITIVES` painter (centered at 0,0,
  ~100×100 space, r≤36, light top-left).

## Small modules
- **xp_bar.ts** (~65) — pure `xpBarView()`, no DOM (snapshot-tested). Shows the
  post-cap **virtual level** `Lv 20 (+N)` + lifetime total when overflow is on;
  classic "MAX LEVEL" when off. See `virtualLevelProgress` in `sim/types`.
- **meters.ts** (~300) — DPS/HPS/threat meters, encounter-segmented; threat reads
  the mob's real `entity.threat` hate table. Uses `performance.now()` (UI timing
  only — fine here; that ban is sim-only).
- **player_context_menu.ts** (~44) — pure `chatPlayerContextActions()` returning
  whisper/invite/friend/ignore/report actions for the right-click-player menu.
- **auth_utils.ts** (~94) — login/char-select form helpers: password toggle, ARIA
  validity sync, `validateCharacterName` (mirrors the server regex).
