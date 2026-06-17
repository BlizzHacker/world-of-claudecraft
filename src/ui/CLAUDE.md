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

## i18n - IMPORTANT (sparse-overlay model; English-only PRs are legal)
The locale data is split across files. Touch the right one:
- `i18n.en.ts` (nested) is the **authoritative English source** and drives
  `TranslationKey = Leaves<typeof en, 6>`, the dotted-path type every `t()` call uses.
- `i18n.locales/<lang>.ts` are the 13 non-English **flat sparse overlays**
  (`Partial<Record<TranslationKey,string>>`), the ONLY files a translator edits. An
  omitted key is filled from English by the build and marked `pending` in the registry.
- `i18n.resolved.generated.ts` is the **generated dense table** the runtime imports
  (do not hand-edit). `i18n.status.json` is the **registry** (translated/pending/blocked).
  Both are regenerated by `npm run i18n:build` / `npm run i18n:scan` and committed.
- `i18n.ts` is the thin runtime: `t()`, `tOptional`, `hasTranslation`, formatters,
  `getLanguage`/`setLanguage`, `supportedLanguages`. `translations` maps all 14 locales
  (en + 13); add to it to make a new locale selectable.

`t(key)` **throws on an untracked key in dev/test**, renders English for a `pending`
key on **non-release builds only**, and **hard-fails a pending key on a release build**
(`isReleaseBuild()` = `I18N_RELEASE=1` or `import.meta.env.PROD`). The HUD is fully
localized (~560 `t()` calls in hud.ts); prefer `t()` for new user-facing strings.

**Contributor workflow (add a player-visible string):**
1. Add the key to `en` (`i18n.en.ts`) and render it through `t()`. Do NOT edit the
   13 overlays - the build fills them from English and the registry marks them `pending`.
2. If the string originates in `src/sim/` or `server/` (which stay language-agnostic),
   register a matcher RULE in the table matching the emit's ORIGIN (`sim_i18n.ts` for a
   `src/sim/` emit, `server_i18n.ts` for a `server/` emit; the two are parallel mirrors)
   in the SAME change. The S3 guard accepts recognition by either matcher and fails if a
   new emit is recognized by neither.
3. Run `npm run i18n:scan` (and `npm run i18n:build`; if the resolved table changed,
   also `npm run i18n:hash -- --write`) and commit the regenerated files.
4. Open the PR. It is green at the PR-tier gate, which does not require translations;
   `tsc` still guarantees English completeness.

The maintainer fills the `pending` slice at release time from `npm run i18n:worklist`.
Full contributor + maintainer flow and the locked-terms glossary:
`docs/i18n-scaling/translation-workflow.md`.

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
