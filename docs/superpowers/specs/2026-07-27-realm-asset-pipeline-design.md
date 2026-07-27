# Realm Asset Mass-Registration Pipeline

**Date:** 2026-07-27
**Status:** Approved design, pre-implementation
**Scope:** Sub-projects A (batch rig/animate pipeline) + B (generated registration), including
the Phase 2 auto-rig. Sub-projects C (equip sockets), D (class rosters), and E (transmog/dye)
are named here only where this spec must leave them a clean seam.

## 1. Problem

Cryptic Realm ships 9 realms. Five of them are art-starved: `arcane`, `dominion`, `exchange`,
and `fps` hold **one file each**; `crypticrealm` holds two. Meanwhile ~10,000 usable GLBs sit
on the USB4 share unreferenced.

The bottleneck is not art. It is that `src/render/characters/manifest.ts` is a hand-authored
2,159-line file with 124 `VISUALS` entries. Registering hundreds of bodies by hand is not
possible, so the assets never reach players.

This spec defines a pipeline that indexes the available libraries, classifies them to realms,
rigs and animates what needs it, gates the results, and **generates** the registration code.

## 2. Ground truth (verified 2026-07-27)

Facts established by inspection, not assumption. These drive every design decision below.

### 2.1 One shared skeleton

Every animated PICKTURA character carries an identical 24-joint skeleton (26 nodes):

```
Hips, LeftUpLeg, LeftLeg, LeftFoot, LeftToeBase, RightUpLeg, RightLeg, RightFoot,
RightToeBase, Spine, Spine01, Spine02, LeftShoulder, LeftArm, LeftForeArm, LeftHand,
RightShoulder, RightArm, RightForeArm, RightHand, (+4)
```

Verified across two unrelated characters (`Ragged_Warlord`, `Hooded_Goblin_Outlaw`): same joint
count, same names, same hierarchy. Consequences:

- Moving a clip between characters is a **direct transplant**, not a retarget. Lossless, cheap.
- `LeftHand` / `RightHand` are real joints, so weapon sockets already exist on every body.
- Auto-rigging static meshes **to this same skeleton** makes the entire clip bank available to
  them at once.

This is the single most important fact in the spec. If it were false, the whole approach would
need to be retargeting, which is far more expensive and lossy.

### 2.2 Library inventory

| Source | Contents | State |
|---|---|---|
| `PICKTURA/animated` | **126 unique characters** by `resultId` (the `x` in filenames is a placeholder, not an identity) | Rigged + animated, shared skeleton |
| `PICKTURA/animated` (subset) | 2 deep motion banks: `019b7548…` (346 files) and `019f483d…` `Ragged_Warlord` (308) | **~327 distinct actions** — the clip source |
| `PICKTURA/glb` | 4,644 meshes | **Unrigged**: `skins=0 anims=0 nodes=1` |
| `moveweight-assets/char-templates` | **1,495 templates / 4,485 GLBs** in `16bit/32bit/64bit/128bit` tiers | Pre-labeled by family + tier |
| `arcforge-smart-forge` | 905 GLBs | Mixed |
| `cr-realms` store (live) | infernal 125, classic 89, arcadevoid 38, claudecraft 22, crypticrealm 2, arcane/dominion/exchange/fps 1 each | Already shipped |

`char-templates` names are structured — `diablo1_arpg_007_re_imagined_diablo_1_scavenger_elite_01`
— carrying family (`scavenger`) and tier (`elite`/`boss`/`nightmare`). Family prefixes:
`diabloimmortal` 399, `diablo4` 140, `diablo1` 100, `d1` 100, `diablo3` 96, `diablo2` 74,
`forest` 33, `iron` 31, `void` 26, `steel` 26.

### 2.3 Engine capabilities that already exist

Do not rebuild these:

- `VisualDef.animUrls?: string[]` — *"Optional extra GLBs that provide animation clips for
  static rig files."* Body GLBs need never be modified; clips live in a shared bank.
- `VisualDef.attach[]` + `weaponSlots[]` + `offhandSlot` — node-based weapon sockets.
- `VisualDef.tint: 'entity'` + `tintStrength` — per-entity colour.
- `VisualDef.autoClip: true` — built for *"an admin body override points a class/NPC at an
  arbitrary library GLB whose clip names are unknown ahead of time."*
- `weapon_skin_rules.ts` / Season 1 Armory — server-enforced skin-on-equip.
- `/api/realm-visuals` — revisioned draft→publish→history runtime body override, permission-gated.
- Prior art: `scripts/_retarget_meshy_rig.mjs`, `_merge_meshy_rig.mjs`, `_bake_meshy_scale.mjs`.

### 2.4 Compute

GPU VM `192.168.0.194` on node `mw-laptop` (RTX 3050 Mobile, 4GB): ComfyUI `:8188`,
Mesh2Motion `:3000`, Blender 4.0.2 worker `:8099`, decimate service. Ollama at `192.168.0.137`.

**Meshy cloud is offline — the account has 1 credit and returns `402 Insufficient funds`.** No
new cloud generations. This spec works exclusively from already-downloaded assets.

Blender 4.0.2 cannot import `EXT_meshopt_compression`; the worker's `_decompress_if_needed()`
runs `gltf-transform cp` first. Any new Blender path must route through that helper.

## 3. Architecture

Seven stages. Each has one job, a file-based input and output, and can be re-run independently.
Stages 1, 2, 5, 7 are pure Node/TS in LXC 171; stages 3, 4, 6 call the Blender worker on `.194`.

```
  [1 index] -> catalog.json
  [2 classify] -> routing.json
  [3 bank] -> picktura_biped_*.glb (7 shared clip GLBs)
  [4 normalize] -> metrics.json (height, yaw, bbox)
  [4b autorig] -> rigged GLBs           (Phase 2 only)
  [5 gate] -> pass.json + reject.json
  [6 sheet] -> contact sheets (PNG grids of 24)
  [7 emit] -> manifest.generated.ts + store deploy
```

### Stage 1 — Index

Reads `PICKTURA/_manifest/*.csv`, walks `char-templates` and `arcforge-smart-forge`. Groups
animated files by `resultId`, discarding the `x` placeholder name. Separates the two motion banks
from the 124 ordinary animated bodies. For `char-templates`, parses the structured name into
`{source, family, tier, bitDepth}` and picks the **highest available bit-tier** per template.

Output `catalog.json`: one record per asset — `{id, path, source, kind, rigged, actions[], bytes}`.

### Stage 2 — Classify

Deterministic lexicon rules over filename + parsed labels produce
`{realms: RealmId[], family, role, primary: RealmId}`.

**Routing is non-exclusive.** An asset may serve several realms; `realms[]` is a list and
`primary` picks its canonical home. This is a direct requirement — assets are to be "re-used
appropriately".

Realm lexicon (per direction given):

| Realm | Theme | Draws |
|---|---|---|
| `infernal` | dark gothic ARPG | demon, devil, imp, balrog, fiend, hell, fallen, butcher, skeleton, undead, zombie, wraith — **the entire `diablo*` / `d1` char-templates set** |
| `classic` | bright fantasy, Warcraft-shaped | orc, human, elf, dwarf, knight, paladin, ranger, troll, goblin, beast — **plus demon-family assets at `tier: elite` or lower only**, so infernal keeps the apex demons (`boss`, `nightmare`) as its own |
| `dominion` | sci-fi alien war, StarCraft-shaped | space, alien, mech, robot, cyber, marine, trooper, drone, exosuit, `steel`/`iron` templates |
| `fps` | Fortnite-shaped shooter, 1st + 3rd person | any humanoid; prioritise gun-holding, soldier, tactical, modern |
| `arcane` | cosmic crystal void | crystal, void, cosmic, astral, ethereal, arcane, mage — the `void` templates |
| `arcadevoid` | arcade | neon, retro, low-poly, arcade |
| `claudecraft` | pristine upstream look | unchanged; curated only |
| `crypticrealm` | namesake landing | curated best-of drawn from all realms |
| `exchange` | cross-realm hub, visitors only | minimal — vendors/NPCs |

Unmatched assets route to a `unassigned` bucket rather than being silently dropped, so coverage
is measurable.

**Role assignment enforces the stated NPC rule:** a body whose mesh has a **baked-in weapon**
is `role: 'npc'` — fixed loadout, no `attach[]`, never player-selectable. A clean-handed body is
`role: 'player'`-eligible and receives sockets. Phase 1 detects baked weapons from name lexicon
(`_with_sword`, `warlord`, `archer`, `gunner`, …) plus `char-templates` tier labels; the contact
sheet is the correction surface for misses.

### Stage 3 — Clip bank

Extracts the ~327 actions from the two motion banks into **7 canonical shared clip GLBs**:
`picktura_biped_{idle,walk,run,attack,death,hit,jump}.glb`. Each carries the 24-joint skeleton
and the chosen take(s). Selection maps bank action names onto engine `ClipMap` slots (e.g.
`Alert`→idle, `Walking`→walk, `Running`→run, `Triple_Combo_Attack`→attack).

This mirrors the existing `infernal_biped_*.glb` convention already in the store — no new concept.
Bodies reference the bank through `animUrls`, so **no body GLB is ever modified**.

Surplus actions (dances, emotes, ~300 of them) are banked but not wired in Phase 1; they are
raw material for sub-project D and for emote support later.

### Stage 4 — Normalize

Per asset via the Blender worker: world bbox → `height` (pivot→crown, the `VisualDef` field),
facing yaw so the model faces `+Z`, and a scale bake where native units are wrong. Precedent:
`_bake_meshy_scale.mjs`. Emits `metrics.json`; does not mutate the source library.

### Stage 4b — Auto-rig (Phase 2)

For **humanoid** static meshes only, as scoped. Per mesh: fit a metarig to the mesh's bbox
proportions, bind with automatic weights, and conform the result to the **same 24-joint skeleton**
so the Stage 3 bank applies unchanged. Non-humanoids (quadrupeds, vehicles, props) are explicitly
out of scope — automatic weights fail on them at a rate that would poison the gate.

Mesh2Motion `:3000` is evaluated here as an alternative rigger. It is a Vite SPA with no confirmed
batch API (a 200 on any path proves nothing, since every path returns `index.html`), so it is a
**fallback, not the plan of record**. If Blender auto-rig yields an unacceptable pass rate, that
finding is reported before burning a cycle on Mesh2Motion.

### Stage 5 — Gate

Automated rejection, no human in the loop:

- no armature / `skins=0` after rigging
- exploded weights (vertex displacement beyond a bbox multiple in any bank clip)
- height outliers: normalized `height` must fall within 0.5×–2.5× the median height of that
  realm's already-registered bodies (bootstrapped from the 124 hand-authored `VISUALS` entries)
- foot-slide beyond tolerance (root travel vs. `walkRef`/`runRef` cycle distance)
- missing required `ClipMap` slots
- degenerate geometry, zero-area UVs, missing textures

Emits `pass.json` / `reject.json` with a machine-readable reason per reject, so a failing family
can be diagnosed in aggregate rather than one file at a time.

### Stage 6 — Contact sheets

Survivors render through the Blender worker as **grids of 24**: turntable stills plus walk-cycle
strips. Review is per page, and rejects are flagged by cell reference. This is the human quality
gate — the one that catches "looks stupid", which no metric detects.

Rejections feed back as a persisted `overrides.json` so a re-run of the pipeline does not
resurrect a body already rejected by eye.

### Stage 7 — Emit

Two outputs.

**Code.** A generated companion module `src/render/characters/manifest.generated.ts` exporting
`GENERATED_VISUALS` and `GENERATED_REALM_FAMILY_KEYS`. `manifest.ts` merges it with
**hand-authored keys always winning on collision**. This mirrors the existing
`src/render/assets/manifest.generated.ts` pattern and honours the repo rule against hand-editing
generated files. Curated infernal/classic work can never be clobbered by a pipeline run.

Generated entries use `animUrls` pointing at the Stage 3 bank, `autoClip` where clip names are
uncertain, `height`/`yaw` from Stage 4, and — for `role: 'player'` bodies — `attach[]` +
`weaponSlots`/`offhandSlot` bound to `RightHand`/`LeftHand`. That hands sub-project C a solved
socket problem rather than a research problem.

**Assets.** GLBs ship **out-of-band** to `171:/mnt/usb4/moveweight-assets/cr-realms/<realm>/`
(tar → scp to host → `pct push 171` → extract → `chmod 644`). `public/cr-realms/` is gitignored,
so assets never travel with code. This is the trap that has repeatedly made shipped fixes look
undone.

## 4. Deploy

Code deploys via `scripts/admin/update.sh` with `CR_REMOTE=fork CR_BRANCH=<branch>` (the script's
own defaults are stale). Public realm domains are served by the **stage-live rings** at
`/opt/cr-stages/<realm>/live`, **not** `/opt/cryptic-realm` — deploying only the base leaves the
public site unchanged. Rings bind ~20s–2min after restart under load, so a brief 502 during
deploy is expected; poll for the port before declaring success.

All 8 live rings share the `live` branch, so advancing it moves all 8. Per-realm deploys use the
established `git checkout --detach <sha>` pattern in that ring.

## 5. Testing

- **Lexicon classifier** — pure and deterministic; unit tests over fixture filenames, including
  the non-exclusive multi-realm cases and the `unassigned` fallback.
- **Store resolution** — every key in `GENERATED_VISUALS` resolves to a GLB that actually exists
  in `CR_REALMS_DIR`. This is the test that catches the gitignore/out-of-band trap, and it is the
  most valuable test in the spec.
- **Collision** — no key appears in both `VISUALS` and `GENERATED_VISUALS` without the
  hand-authored one winning.
- **Bank integrity** — each of the 7 clip GLBs carries the 24-joint skeleton and its required takes.
- **Gate regression** — known-bad fixtures stay rejected; known-good stay passing.
- `npm run gate` and `npm run security:gate`.

**Expected non-failure:** `tests/recovery_manifest.test.ts` pins `candidate.branch` to
`codex/cryptic-recovery-program` and fails on any side branch **by design**. Its two assertions
(branch-name equality, pinned-sha ancestry) are not regressions and are not to be chased.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Auto-rig pass rate too low to matter (Phase 2) | Phase 1 ships independently and is unaffected; Phase 2 reports pass rate before mass runs |
| 4GB VRAM ceiling on the GPU VM | Stages 3/4/6 are Blender CPU-side geometry work, not inference; ComfyUI is not on the critical path |
| Blender cannot read meshopt-compressed GLBs | Route every Blender call through the worker's existing `_decompress_if_needed()` |
| Contact-sheet review becomes the bottleneck | Grids of 24 plus persisted reject overrides; auto-gate removes the obvious failures first |
| Generated file bloats the client bundle | Visual keys land in the `props-*` chunk; measure with `asset_budget.mjs` and tier the emit if needed |
| Store/manifest divergence | Store resolution test runs in CI; regenerated `manifest.json` must be promoted into the store, verified URL-by-URL |

## 7. Out of scope

- **C** — equip-driven weapon swapping and the full socket UX (this spec only emits the sockets)
- **D** — per-realm character class rosters
- **E** — transmog / dye / armour colour customisation beyond the existing `tint`
- Koolo item assets (explicitly under construction)
- Any new Meshy cloud generation (account has no credits)
- Non-humanoid auto-rigging

## 8. Success criteria

1. Every one of the 9 realms has a materially larger registered body count; the five starved
   realms (`arcane`, `dominion`, `exchange`, `fps`, `crypticrealm`) go from 1–2 files to a
   populated roster.
2. Registration is generated, not hand-authored — adding assets costs a pipeline run.
3. Every generated key resolves to a GLB present in the live store, proven by test.
4. Player-eligible bodies carry `RightHand`/`LeftHand` sockets, unblocking sub-project C.
5. Bodies that ship holding a weapon are `role: 'npc'` and are not player-selectable.
6. Phase 1 is deployable to a live ring without waiting on Phase 2.
