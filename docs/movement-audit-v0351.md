# Movement audit — v0.35.1 intake regressions (doors dead + invisible walls)

Date: 2026-08-16 · Branch: `codex/xbox-client-v035` · Realm probed: `infernal`
Method: data-layer probe (tsx over the real sim modules, seed 20061) + live browser
probe (headless Chromium against the deployed client, offline world) + post-fix
browser probe against a local dev server running the patched tree.

## Symptoms (operator report, live line)
1. Buildings can no longer be entered (door/interior transitions dead).
2. Invisible walls block travel in the overworld.

Both worked on the pre-merge v0.30 fork line. The pre-merge world had **3 zones**;
upstream v0.35 brought ~11 more zones plus authored town rebuild kits (Eastbrook wall
parapet, Fenbridge palisade + gate jambs, the Veiled Hollow `hollow*` building set).
Each regression is a fork assumption the new world silently violated.

## Root cause 1 — door kinds: `hollow*` unmapped (8/78 buildings dead)
`interiorTypeForBuilding` (src/sim/interiors.ts) mapped only `inn|house|chapel`.
Upstream's Veiled Hollow places `hollowInn`, `hollowHouse` (x4), `hollowSmith`,
`hollowChapel`, `hollowMarket` — every one returned `null` = solid scenery.

Pre-fix (infernal): doors computed **70 for 78** buildings; dead kinds:
`{hollowInn:1, hollowHouse:4, hollowSmith:1, hollowChapel:1, hollowMarket:1}`.
`tests/interiors.test.ts` "EVERY building kind is enterable" already failed at HEAD.
Live probe: interact at the hollowInn door → no transition (base AND drifted spot).

Post-fix: doors **78 for 78**, dead kinds `{}`; the suite's kind pin passes.

## Root cause 2 — theme spread anchored on the world origin (64/78 buildings displaced)
`themeWorldForRealm` (src/sim/data.ts) displaced every procedural (non-assetId)
building by `pos * buildingSpread` (infernal: 2.6). Tuned when the only themed town
sat at the origin; with upstream's hub towns up to ~1300yd out, the multiply threw
buildings — mesh + collider + door together — hundreds to thousands of yards out of
their towns, leaving building-less NPC squares and building-shaped obstacles across
other zones.

Pre-fix drift by zone (moved / total, max displacement):

| zone | moved | max drift |
|---|---|---|
| eastbrook_vale | 0/7 | 0 (assetId, exempt) |
| mirefen_marsh (Fenbridge) | 0/7 | 0 (assetId, exempt) |
| thornpeak_heights | 5/5 | 1,074 yd |
| galecrest | 7/7 | 1,110 yd |
| veiled_hollow | 8/8 | 1,671 yd |
| drakelands | 4/4 | 3,131 yd |
| frostveil | 7/7 | 2,525 yd |
| amberfall | 4/4 | 3,388 yd |
| willowfen | 5/5 | 836 yd |
| nightbloom | 4/4 | 2,361 yd |
| wraithwood | 4/4 | 2,377 yd |
| palmreach | 9/9 | 1,923 yd |
| evergarden | 3/3 | 1,432 yd |
| farshore_isle | 4/4 | 515 yd |

Live confirmation: 0 meshes at the authored Veiled Hollow inn spot (-59,1033); 1
building mesh standing alone at the drifted spot (-153,2686), a building-shaped
obstacle in the middle of nowhere.

Fix: spread re-anchored on each building's **zone hub** (`hub + (pos-hub)*spread`),
and only for buildings inside the hub's settlement radius — an outlier farmstead
(e.g. Galecrest's inn 152yd from its hub) keeps its authored spot (it still takes the
grander `buildingScale`). For a hub at the origin this degenerates to the original
arithmetic, so the founding infernal look is unchanged.

Post-fix drift: every building stays in its own zone, max displacement ≤ ~46yd
(settlement ring growth), outliers 0. Pinned by the new zone-parity test.

## Root cause 3 — invisible walls: builtin-world checks by OBJECT IDENTITY
The authored town views gate on `getActiveWorldContent() !== BUILTIN_WORLD` (meant
to exclude editor/custom maps). But a themed realm's world is a **copy** (new object)
of the builtin world, so on infernal the check failed and
`buildEastbrookTownView` / `buildFenbridgeTownView` built **empty groups** — while
`staticWorldColliders` kept registering the full-height wall collision from
`PROPS.walls` (Eastbrook parapet + pillars, Fenbridge palisade + gate jambs).

Pre-fix (infernal): **102 colliders sourced from PROPS.walls (42 wall segments), 42/42
segment centers blocking movement, zero rendered meshes** (live probe: 0 meshes within
2.5yd of `eastbrook_wall_00` at (25.6, 12.1) — inside the starter town). The same
identity gate also made `props.ts` double-draw fallback boxes for the authored towns
and dropped the muster-board colliders on themed realms.

Fix: new `isBuiltinWorldContent(content)` in src/sim/data.ts (true for BUILTIN_WORLD
and the themed copy derived from it; editor/custom bundles remain non-builtin), used
by eastbrook_town.ts, fenbridge_town.ts, props.ts (both gates), colliders.ts (muster
boards) and foliage.ts (grass exclusions). On themed realms the authored town kits now
render exactly where they collide.

## Root cause 4 (found in passing, live crasher) — missing import
`src/render/characters/index.ts:77` called `resolveActiveRealmId()` without importing
it (introduced by the sex-suffixed realm-bodies commit 5382450456; vite does not
type-check, so the broken bundle shipped). The live client throws
`ReferenceError: resolveActiveRealmId is not defined` continuously — confirmed by the
live probe on infernal.crypticrealm.com. `npx tsc --noEmit` flagged it as the only
`src/` error. Fixed with the import; post-fix probe logs zero page errors.

## Post-fix verification (browser, patched tree, dev server, ?realm=infernal)
- Boot: zero page errors before AND during all probes (the pre-fix live client
  throws `resolveActiveRealmId is not defined` continuously).
- Town kits build on infernal: `eastbrookTownRebuild` 12 children / 26 wall
  segments / 6 gates; `fenbridgeTownRebuild` 13 children / 16 segments / 4 gates.
  26 + 16 = 42 = exactly the 42 wall segments registered by staticWorldColliders:
  render and collision derive from the same set again.
- Door walk-through (Eastbrook house door at 6.9,-15.9): walked into the door
  ring (position advanced frames apart), interact → interior band (x=115600),
  exit → back outside at the same overworld spot.
- Veiled Hollow inn: building mesh present at its in-town themed spot
  (-89.4,1037.8); at its door (-95.6,1035.5) interact → interior (x=115000),
  exit → back to (-95.6,1035.5). Pre-fix this failed at BOTH the authored and the
  drifted spot.
- Ex-drifted obstacle sites: stash-toggle measurement — pre-fix 64/64 procedural
  buildings sat displaced (drifts of ~500-3400yd, e.g. Thornpeak houses at
  z≈1700-1745 inside the Veiled Hollow band, several in open water), each site
  blocked; post-fix those coordinates carry no colliders (`isBlocked=false`
  sampled along both ex-drifted route lines) and the walk crosses the
  ex-hollowMarket line with position advancing frames apart (the ex-hollowInn
  line sits in deep lake water where the locked-input walk harness cannot swim —
  data-layer isBlocked confirms it clear).
- Eastbrook wall still blocks (it is a real wall — now a VISIBLE one): the walk
  toward `eastbrook_wall_00` does not cross it, and 42/42 segment centers block
  at the data layer, now with matching rendered geometry (screenshot
  wall_00_after_fix.png in the probe output).

## Gates
- `npx tsc --noEmit`: 62 errors before → 61 after; the delta is the fixed
  `characters/index.ts` source error; every remaining error is pre-existing
  test-file noise (sfx_studio / asset_pipeline / grand_armoury capture suites).
- Suites: tests/interiors.test.ts 10/10 (the previously-failing kind pin plus 2 new
  regression pins), town_collision 7/7, props_building_placement 3/3,
  blocker_colliders 13/13, home_interiors 3/3, eastbrook_town_renderer 17/17,
  fenbridge_town_renderer 20/20, streetlamp_colliders 11/11, delve_colliders 7/7,
  door_portal 9/9, town_portal 3/3, pathfind 12/12, character_appearance 3/3.
- tests/realm_decor.test.ts fails 2 tests (an arcadevoid zone-spread assertion and a
  20s timeout) IDENTICALLY with this diff stashed — pre-existing on the branch,
  unrelated to this change (verified by stash-toggle on the same box).
