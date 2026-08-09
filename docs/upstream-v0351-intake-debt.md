# v0.35.1 intake: test-debt ledger (2026-08-09)

## Addendum: the production asset-wave merge (2026-08-09, second pass)

The 58-commit production wave (IP quarantines, portrait/body resolution, anim
bank fixes, decor, the overworld wilds bestiary) merged into this branch after
the initial intake. Reconciliation notes:

- tests/parity: goldens regenerated (the appended wilds camps shift world-gen
  draws); three scenarios re-hunted per their own documented rule
  (hit_rating_heroic pair 1022 to 1023, master_loot 38 to 69,
  professions_craft 5 to 25); two suite timeouts widened for the heavier
  13-zone world, assertions unchanged.
- Pin updates for the merged union: command_schema send/dispatch counts
  (224/237), the S3 social-directory walk (+6 fork venue modules), the
  hud_perf_budget options_window and unit_portrait_painter allowances (the
  merged options window carries the fork trio plus the wave's evolution; the
  retired requestIdleCallback name-only exception is replaced by a full
  requestAnimationFrame drivers contract and the exception table is pinned
  empty).
- tests/visual_manifest.test.ts: three failures are PRE-EXISTING production
  debt, not introduced by the merge. The tests (identical bytes on both
  parents) expect curated bodies (npc_chronicler, mob_spearjaw, the Infernal
  humanoid clip packs) that production's own crypticrealm crossroads routing
  (the realm block in visualKeyFor plus infernalNpcVisualKey's role map)
  cannot return; they fail on the production parent by code identity. The
  merge preserves production's live rendering; reconciling the tests with the
  crossroads routing is follow-up work.
- The guide keeps the upstream on-disk-GLB guarantee: realm-store bodies bake
  model: null (type widened to string | null, consumers null-guard) rather
  than a /cr-realms/ URL no public checkout can serve; six orphaned mob_wolf
  stills deleted with their figures.

The one-jump intake of upstream release/v0.35.1 into the asset-pipeline line was
reconciled to a measurably healthier state than the production parent, without
reaching full suite green. This file is the honest ledger so nobody re-derives it.

## Where the branch stands

- tsc: 63 errors, all inside the parent's pre-existing 76-error tooling-test
  families (sfx_studio, eastbrook armoury capture, asset_pipeline, sfx_conform).
  No src/ or server/ type errors.
- tests/parity: fully green after a deliberate golden regeneration (its own
  commit) plus probe restaging around merged-world content.
- Full vitest (parity excluded): 172 failing files / 300 failing tests of 33k.
  The PRODUCTION PARENT fails 197 files / 163 tests (plus suite-level load
  failures) on the same machine and toolchain: the intake FIXED 126 previously
  failing files and introduced 101, net minus 25.
- Green core surfaces after reconciliation: architecture guards, world_api
  parity (336), client_shell (94), guide (87), keybinds, builder_props (231),
  pvp_safety, chronomancy_echo, offline_save.

## Systemic causes already fixed (patterns to reuse)

- The Hellmaw Well delve arch collided in EVERY realm while rendering only in
  infernal: an invisible wall beside the town well. Now realm-gated in
  colliders.ts exactly like the render skip. Many spawn-staged suites turned
  green from this one fix.
- Fork grinding town NPCs pick fights whose mob hit-table swings draw from the
  shared rng stream: parity probes that pin draw-clean windows must silence
  world mobs up front (the despawnMobs idiom).
- Generated artifacts (i18n resolved bundles, translation keys, sfx manifest,
  sitemap statics, wiki content/stills, builder-prop mirror) must be
  regenerated after any intake; stale locale-overlay keys are stripped against
  translation_keys.generated.ts.

## Remaining merge-caused failing files (101)

Grinding these is pin-updates and fork-feature retuning against upstream's
reshaped world (shorelines, vendor stock, mobile CSS), file by file. The
authoritative lists live beside the runs that produced them; regenerate with
two `vitest run --reporter=dot` passes (this branch vs the parent) and comm.
fenbridge_town_assets pins package.json whole into the shipped-GLB source
fingerprint (upstream's own noted follow-up is narrowing it to dependency
fields; a local re-export is NOT the fix, its bytes are machine-dependent).
Top families: deploy_watchdog (fork ops tooling vs upstream script shapes),
professions_trend, character_clipmaps, icon_asset_audit, battleground_band,
warfare_vendor_npc, fishing_waters shoreline tuning, chronomancy balance pins.

## Pre-existing parent debt (do not attribute to the intake)

sfx_studio (12 runtime + 22 tsc), prod_cpu_monitor (5), localization_coverage
(1), eastbrook capture/asset_pipeline tsc families, and the bulk of the
parent's 197 failing files.
