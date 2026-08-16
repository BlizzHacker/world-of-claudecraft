# Movement audit 2 — full-world collider-vs-visual sweep

Date: 2026-08-16 · Branch: `codex/xbox-client-v035` · Base: `28f223b44a` (audited at `c0252f7455`)
Realm: `infernal` (the live line) · Seed: 20061 (`WORLD_SEED`)

The v0.35.1 audit (docs/movement-audit-v0351.md) fixed the town-wall render gate
and re-anchored theme-spread buildings; the operator still hit unseen blockers in
the overworld. This audit enumerates EVERY registered open-world collider, tests
each one for rendered geometry, and fixes every collider whose visual source can
silently fail to draw.

## Method

1. **Data layer** (`tsx` over the real sim modules, realm pinned via
   `setRealmHostEnv`): enumerate `staticWorldColliders(20061)` +
   `streetlampPlacements` + the lazy decoration field (via
   `queryOpenWorldColliders` tiling), attributing every collider to its source
   loop by replicated placement arithmetic. Pre-fix: 1,693 authored + 276
   streetlamps + 4,063 decoration bodies; **0 unattributed**.
2. **Render layer** (headless Chromium/SwiftShader, offline world, local vite
   dev of the patched tree, the `npc_shots.mjs` boot pattern, protocolTimeout
   900000; `scripts/_audit_render.mjs`): force-build every zone's lazy feature
   group (`renderer.ensureZoneFeatures` per zone), wait for the scene to stop
   growing, then splat every non-ground rendered vertex / instance into a 2yd
   XZ occupancy index (~3.3M points) and test every collider footprint
   (+1.6yd margin) for geometry rising ≥0.35yd above its local ground.
3. **Anchor census**: `resolvePosition` at every authored NPC, camp
   center/ring sample, graveyard anchor and zone hub (2,126 anchors), on
   infernal AND on claudecraft (the untheme baseline).
4. **Walk layer**: `resolveMovement`/`isBlocked` (the server's own kernel)
   driven along probe lines pre- and post-fix.

Probe scripts: `scripts/_audit_render.mjs` in-repo; `/tmp/cr_audit/*.mts` on
CT 171 (audit_data / audit_npc_census / walk_verify / check_trees, tsx from the
repo root).

## Collider inventory by source (infernal, authored + lamps, pre-fix)

streetlamps 276 · reachPalms 258 · decorProps 189 · ruinRings:column 160 ·
gatherNodes 104 · graveyards:stone 96 · ruinRings:relic 87 · stalls:dressing 58 ·
buildings:procedural 57 · fenWillows 54 · campfires 53 · fences 53 ·
walls:pillar 52 · crates 46 · walls:segment 42 · tents 40 · stalls:legacy 29 ·
greatTrees 26→**23** · hollowWillows 24 · farshorePalms 23 · valeCup 20 ·
mudHuts 18 · wells 16 · townProps 16 · boarpit 16 · buildings:assetId 14 ·
mailboxes 14 · dungeon-door-jamb 12 · mines:post 10 · blockers 10 · derby 10 ·
homes 9 · emberLilies 8 · fenbridge:gate-jamb 8 · chapel tower/hall 14 ·
raceJumps 7 · portal-cave 6 · docks:dressing 6 · mines:mound 5 ·
mines:cart 5→**4** · stalls:sized 3 · benches 3 · delveMarkers 3 ·
bankerChest 3 · docks:hut 2 · docks:boat 2 · noticeboards 1 · musterBoards 1.
Plus 4,063 lazy decoration bodies (rock/tree). Post-fix authored total: 1,689.

## Static (data-layer) verdicts

- **decorProps** (the prime suspect): all 189 collider-carrying rows name a
  `PROP_ASSET_DEFS` key AND ship their GLB in `public/` + `dist/`. No phantom
  today; the renderer's "unknown prop key … skipped" arm stays a loaded gun, so
  the new pin (below) jams it.
- **content.placements**: 0 on the builtin world — the editor is the only
  writer, so no store-404 placement can reach live collision.
- **Auto realm decor** (`realm_decor.ts`): produces NO colliders by design;
  a decor GLB 404 cannot make a phantom through that system.
- **content.blockers**: 10 = 8 moderation-jail cage segments at
  (-12000,-12000) (off-map, deliberate) + 2 castle slot seals inside the
  drakelands castle footprint (deliberate). **Allowlisted.**

## Render-sweep mismatches and their fates

First sweep: 1,969 colliders tested, **110** without rendered geometry, in 10
buckets. Second sweep (after the first fix wave + probe corrections): **15**.
Every bucket was root-caused; six were real bugs, the rest probe artifacts or
by-design (each verified, not assumed):

| bucket | count | verdict |
|---|---|---|
| ruinRings:relic | 24 flagged (all 87 affected on low tier) | **REAL — fixed.** `render/props.ts` skipped the toppled relics (`if (lowProps) continue`) on low graphics profiles while their solid, standable colliders register on every tier: three invisible obstacles at every ruin ring's heart for low-tier clients. The gate predates the colliders. Relics now draw on every tier. |
| stalls dressing | masked by the adjacent stall mesh; all 58 affected on low tier | **REAL — fixed.** Anvil/weapon-stand and crate/barrel dressing (`SMITHY_DRESSING`/`STALL_DRESSING` colliders) was behind `!lowProps`. Now drawn on every tier. |
| docks:dressing | masked; all 6 affected on low tier | **REAL — fixed.** `DOCK_DRESSING` barrels/crate behind `!lowProps`; colliders tier-independent. Now drawn on every tier. |
| delveMarkers | 1 (drowned_litany slab, (-95,509)) | **REAL — fixed.** The marker loop gated on `loadedProps.has('delveEntrance2')`, but `propAsset()` CONSUMES `loadedProps` on first extraction — marker #1 rendered, every later marker silently skipped, while its multi-yard arch-slab collider stayed solid: an invisible wall in the marsh. The arch is now extracted once before the loop. Post-fix screenshot: the arch stands at the slab (site_drowned_arch.png). |
| mines:cart | 1 (crypt mine, cart spot (-150.4, 607.2)) | **REAL — fixed at the source data.** The renderer deliberately draws NO ore cart at the Abandoned Crypt's mine, but colliders.ts registered the cart circle at every mine: a phantom crate beside the crypt mouth. The predicate moved to sim (`prop_layout.isAbandonedCryptMine`); both halves read it; the collider no longer registers there. |
| greatTrees | 9 persistent | **REAL, two mechanisms — both fixed.** (a) Three wraithwood records ((326,1360), (456,1580), (412,1636)) sit BELOW the waterline (terrain −4.5…−5.4 vs WATER_LEVEL −4.3): every great-tree renderer refuses submerged spots, so their 3.8–4.4yd trunk colliders were invisible mid-lake blockers on every tier. colliders.ts now mirrors the same gate (26→23 trunks), pinned by the new test. (b) All four great-tree renderers (realm_flora — the Eldergleam in the town square! — haunt/garden/jungle features) gated placement on a build-time `if (greatTreeScene)`, so a feature group built before the deferred preload resolved stayed treeless for the whole session while every trunk collider stood. Each renderer now places immediately when the scene is cached, or in the load's `.then` otherwise (loadGltf dedupes against the preload). The instrumented final sweep proves the outcome: a placed tree Group stands at every above-water trunk coordinate. |
| streetlamps | 12 (all `thornpeak_beacon`) | Probe artifact: the sweep's ground-exclusion term `beacon` matched the `streetlamps-thornpeak_beacon` group. Regex anchored; clean in sweep 2. |
| hollowWillows | 21 | Probe artifact: the willows render under `water-flora`, which the broad `water` term excluded. Fixed; clean in sweep 2. |
| reachPalms / farshorePalms | 33 / 4 | Probe artifact: instanced canopies sampled at bounding-sphere centers, yards off a leaning palm's trunk seat. Instance origins now splatted; clean in sweep 2. |
| mailboxes | 4 | **By design — allowlisted.** Ravenpost pillars are sim ENTITIES whose meshes build on approach (`renderer.sync`), like every entity; a walking player always sees the pillar before reaching it. |
| bankerChest | 1 (Highwatch) | **By design — allowlisted.** The chest is an entity-attached decoration built with the banker's rig on approach, and it has a procedural fallback if its GLB is missing — no load-race phantom possible. |
| ruinRings:relic residual | 1 ((141.1,707.7)) | Threshold edge: the statue block on a thornpeak slope reads just under the sweep's ground+0.35 gate at the collider's own ground sample; the ring's head and column register geometry and the site screenshot shows the relic cluster standing. |
| portal-cave | 1 in sweep 1 | Cave-mouth shaping flank inside the modeled rock silhouette; present in the settled sweep 2. |

Final sweep (all fixes applied, fresh enumeration: 1,965 colliders — the three
submerged trunks and the crypt cart no longer register): 22 flagged, ALL
explained with in-run evidence:

- 6 greatTrees — the probe's own scene dump shows a placed tree Group at
  EXACTLY each flagged coordinate (`feature children:` in probe.log:
  haunt-features Group@404,1390 / @330,1706 / @250,1440, garden-features
  Group@264,850 / @390,902 / @462,1068, alongside their siblings), so the
  trees stand; the occupancy sampler under-splats those six clones. Sampler
  artifact, not a phantom.
- 4 mailboxes + 1 bankerChest — entity-rendered on approach (by design,
  allowlisted above).
- 1 ruinRings:relic — drawn (site screenshot), threshold edge on a slope.
- 8 dungeon-door-jambs — present in every healthy sweep; this CPU-starved run's
  entry-guard log explicitly lists `props.dungeon-doors` among the prewarm
  passes that timed out, so the jamb view had not built when the sampler ran.

Net: every collider in the world either has rendered geometry, is proven
placed by the scene dump, or is an entity-rendered/by-design allowlist entry.

## NPC / camp anchor embed census (the re-anchoring theory)

2,126 anchors per realm; embedded (resolvePosition moves a 0.5yd body):
infernal **81**, claudecraft (untheme baseline) **80** — and the sets nearly
coincide. Infernal-only deltas are 6 camp-ring samples standing in the ordinary
decoration field; claudecraft-only deltas are 5 NPCs that infernal's 2.6× hub
spread actually FREES. Verdict: NPC/camp embeds are upstream-authored baseline
(17 authored NPCs stand in ordinary prop colliders on BOTH realms, pushes of
0.05–3yd), **not** a wave-13 re-anchoring effect.

## Walk verification (server kernel, seed 20061, infernal)

- **Crypt mine cart line** (-150.4,601)→(-150.4,613), through the ex-phantom
  cart: pre-fix 4/25 samples blocked, walk STALLED at z=606.1 (nothing drawn
  there); post-fix 0/25 blocked, WALKED THROUGH.
- **Drowned shrine arch** (-95,502)→(-95,516) through the slab: blocked pre
  AND post (5/29) — a REAL gameplay blocker, kept; the fix restores its mesh so
  the wall is visible (site_drowned_arch.png). Bypass line
  (-104,502)→(-104,516): 0/29, walks through.

## Fixes (this change)

- `src/sim/colliders.ts`: no cart collider at the crypt mine; great-tree trunks
  register only where the renderers can draw a tree (above the waterline).
- `src/sim/prop_layout.ts`: `isAbandonedCryptMine` — ONE predicate for both the
  renderer's crypt dressing and the collider skip.
- `src/render/props.ts`: relics, stall dressing and dock dressing draw on every
  graphics tier (and join the low-tier prewarm list, the headstone rule); the
  delve arch is extracted once before the marker loop.
- `src/render/realm_flora.ts`, `haunt_features.ts`, `garden_features.ts`,
  `jungle_features.ts`: great trees place now-or-on-load instead of
  build-time-only.
- `tests/collider_renderable_source.test.ts` (new pin, "a collider requires a
  renderable source"): decorProps keys must name a `PROP_ASSET_DEFS` entry
  whose GLB ships; the crypt mine registers no cart collider while every other
  mine still does; great-tree trunks register exactly where a tree is drawable.

Deliberately NOT done: tying collider registration to client load success.
Collision is server-shared sim state — a client whose GLB fetch failed must
still collide identically or players desync. The correct seam is static parity
(data ↔ renderer registry) plus renderers that may not skip solid props
per-tier or per-load-order — which is what the fixes above enforce.

Known opposite-polarity note (visible but walk-through, pre-existing): hutless
docks (Gullhaven, Drifthaven) draw dressing + rowboat with no colliders —
cosmetic, out of scope here.

## Gates

- `npx tsc --noEmit`: 61 errors before → 61 after, identical per-file set
  (clean worktree comparison at `c0252f7455`).
- Suites (clean worktree + this diff, `--testTimeout=120000` on the loaded
  box): tests/collider_renderable_source 6/6 (new), blocker_colliders 13/13,
  streetlamp_colliders 11/11, delve_colliders 7/7, town_collision 7/7; plus the
  flora-adjacent suites (render_glb_replacement_assets, okku_placement,
  evergarden, reach_palms_cliffs): 45 passed / 2 pre-existing skips.
- No deploy: live rings untouched.
