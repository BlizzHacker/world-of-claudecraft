# v0.35.1 intake: test-debt ledger (2026-08-09)

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
Top families: deploy_watchdog (fork ops tooling vs upstream script shapes),
professions_trend, character_clipmaps, icon_asset_audit, battleground_band,
warfare_vendor_npc, fishing_waters shoreline tuning, chronomancy balance pins.

## Pre-existing parent debt (do not attribute to the intake)

sfx_studio (12 runtime + 22 tsc), prod_cpu_monitor (5), localization_coverage
(1), eastbrook capture/asset_pipeline tsc families, and the bulk of the
parent's 197 failing files.
