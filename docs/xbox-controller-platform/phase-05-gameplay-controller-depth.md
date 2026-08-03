# Phase 05: Gameplay Controller Depth

## Purpose

Deliver console-grade gameplay control: preserved analog movement magnitude, complete access to action-bar slots 0 through 22, held-action semantics, reusable layers/pages/radial selection, dispatcher parity for gameplay/HUD/crafting/pets, contextual controller glyphs, and accessible event-driven haptics.

## Deliverables

- Extend shared movement intent so analog stick magnitude survives client input, online wire validation, authoritative server simulation, offline simulation, and headless parity while digital input remains full-speed.
- Make all 23 action slots reachable with a learnable controller scheme using action layers, pages, and/or a radial selector, including press/hold/release behavior.
- Replace ad hoc gameplay switch logic with a typed action registry/dispatcher covering all supported gameplay, HUD, crafting, professions, pet, targeting, interaction, and menu commands.
- Add one contextual glyph service and one configurable haptic-feedback service that consume current controller kind and authoritative/local UI events without affecting gameplay outcomes.

### Starter Prompt

~~~text
This is Phase 05 of Xbox Controller Platform: Gameplay Controller Depth.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use Opus 4.8 or ultracode only when the runtime actually provides them. Otherwise request bounded Codex subagents explicitly, limited by available slots, with a merge barrier and adversarial verification. Never claim unavailable controller hardware or unrun multiplayer/headless results.

Goal: Make controller gameplay expressive and parity-safe by preserving analog movement magnitude across every host, reaching all 23 action slots with correct press/hold/release semantics, unifying the action dispatcher, and adding contextual glyph/haptic feedback without changing game authority.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root `AGENTS.md`, root `CLAUDE.md`, `src/CLAUDE.md`, `src/sim/CLAUDE.md`, `src/game/CLAUDE.md`, `src/ui/CLAUDE.md`, `src/net/CLAUDE.md`, `server/CLAUDE.md`, `headless/CLAUDE.md`, `python/CLAUDE.md`, `scripts/CLAUDE.md`, and `tests/CLAUDE.md` where present.
- Read packet cross-cutting docs, Phase 01 through 04 outcomes, this file, and the controller mode/adapter/provider state in `state.md`.
- Scan memory if available. Record branch, phase-start SHA, UTC timestamp, dirty paths, available real/synthetic controllers, server/local test environment, and concurrent ownership. Preserve unrelated work and stage exact paths only.
- Require Phase 04 QA PASS. This phase may alter shared movement input, so all three hosts and wire validation must land together. Do not mutate production or Store state.

STEP 1 - EXPLORE CONTEXT:
Spawn read-only Explore agents to return focused summaries:

Movement and cross-host parity:
- `src/game/gamepad.ts`, `src/game/gamepad_map.ts`, `src/game/input.ts`, `src/game/mobile_controls.ts`
- `src/sim/types.ts`, `src/sim/move_input.ts`, movement integration in `src/sim/sim.ts` and extracted motion modules
- `src/world_api.ts`, `src/net/online.ts`, input handling and bot observation in `server/game.ts`
- `headless/`, `python/`, RL action/observation bindings, and parity harnesses
- `tests/move_input.test.ts`, `tests/player_motion.test.ts`, `tests/self_motion.test.ts`, `tests/world_api_parity.test.ts`, `tests/parity/harness.test.ts`, `tests/env_protocol.test.ts`, `tests/bandwidth.test.ts`, and movement/anti-cheat tests

Actions, UI, and controller feedback:
- Phase 03 controller service/dispatcher and Phase 04 onboarding adapters
- `src/game/gamepad_bindings.ts`, `src/game/keybinds.ts`, `src/game/input_activity.ts`, `src/game/settings.ts`
- `src/main.ts` action dispatch and `InputCallbacks`
- `src/ui/hud.ts`, `src/ui/hotbar.ts`, `src/ui/action_bar_view.ts`, `src/ui/action_bar_painter.ts`
- `src/ui/mobile_action_page_view.ts`, `src/ui/mobile_action_ring_painter.ts`, mobile action-page callers
- `src/ui/crafting_view.ts`, `src/ui/crafting_window.ts`, profession UI, `src/ui/pet_action_icons.ts`, pet bar/commands, target/interact flows, ground aiming, and Vale Cup hold-to-charge
- `src/world_api/pet.ts`, `src/sim/pet/pet_commands.ts`, and current command dispatch for pet/crafting/profession actions
- glyph/label tables and controller-kind detection in `src/game/gamepad_map.ts`; existing vibration logic in `src/game/gamepad.ts`; event surfaces in `IWorld`/`SimEvent`/HUD

Tests and harnesses:
- `tests/gamepad.test.ts`, `tests/gamepad_controls.test.ts`, `tests/gamepad_map.test.ts`, `tests/hotbar.test.ts`, `tests/action_bar_view.test.ts`, `tests/action_bar_painter.test.ts`, `tests/loadout_action_bar.test.ts`
- `tests/crafting_view.test.ts`, `tests/crafting_window.test.ts`, `tests/professions_crafting.test.ts`, `tests/professions_crafting_hub.test.ts`
- `tests/pet_action_icons.test.ts`, `tests/pet_command.test.ts`, `tests/pet_commands_module.test.ts`, `tests/pet_bar_keybinds.test.ts`
- `scripts/gamepad_shot.mjs`, `scripts/mp_browser.mjs`, and real-browser test conventions

The reports must state the exact slot count/numbering, binding persistence, available physical inputs, modifier conflicts, trigger analog/digital semantics, held-slot behavior, radial/page reuse opportunities, every existing action id and dispatcher branch, all current glyph kinds, haptic event sources, movement sanitizer/wire encoding, server clamps, sim speed formula, RL representation, and bandwidth implications. Identify whether an `IWorld`/wire/event extension is necessary and list every parity site. Do not guess.

For current W3C Gamepad haptics, WebView2/UWP bridge capabilities, Xbox controller layouts, and accessibility guidance, spawn a web-research agent using current official primary sources. Return supported APIs, graceful fallback requirements, activation constraints, controller-kind limitations, and citations. Mark unverifiable hardware behavior OPEN.

STEP 2 - ORCHESTRATE AND EXECUTE:
Use a bounded vertical split with explicit file ownership. Shared movement/wire files must have one integration owner or isolated worktrees and a strict merge barrier.

Analog movement slice:
- Replace digital-only `stickToMoveFlags` output with a bounded camera-relative analog vector or magnitude plus direction, designed in the shared `MoveInput` contract. Preserve exact digital keyboard/touch behavior and backward-compatible decoding of old boolean-only frames.
- Sanitize finite values, clamp range, resolve contradictory input, and assign compact wire fields with explicit defaults. Unknown/malformed/NaN/Infinity payloads fail safe. Include analog state in change signatures and input-rate behavior.
- Apply magnitude to authoritative movement in the shared deterministic sim so offline browser, server, and headless run the same math. Digital input maps to magnitude 1. Avoid platform clocks/randomness and frame-rate-dependent speed.
- Update ClientWorld, server parser/anti-cheat observation, headless/RL bindings, tests, bandwidth pins, and any replay/golden formats in one change. Maintain old-client compatibility or add an explicit protocol/version gate and document it.

Action access and dispatcher slice:
- Define an exhaustive typed controller action registry instead of free-form strings. It must cover slots `slot0` through `slot22`, target/friendly target/cycle, interact, jump, autorun, bags, character, spellbook, talents, quests, map, meters, social, arena, Vale Cup, leaderboard, calendar, Discord, deeds, professions, crafting, chat, pet actions, menu/back, and explicit none where supported.
- Route controller, keyboard, touch, radial/page, and clicked action-bar operations through the same semantic dispatcher where their behavior is equivalent. Keep narrow modality adapters only for pointer/OSK mechanics.
- Preserve `pressSlot`/`releaseSlot` for charged or held abilities, not just `castSlot` rising edges. Disconnect, layer change, modal, text entry, and suspension must release held slots exactly once.
- Add action layers/pages and a radial or similarly controller-native selector that reaches all 23 slots without ambiguous chords. Define modifier press/release, active-layer indicator, cancel, selection, page wrap/clamp, empty/disabled slot, cooldown/resource/out-of-range feedback, and remapping persistence.
- Extract a generic pure action-page model that mobile and controller can share where semantics align. Do not regress the existing mobile ring or force controller-specific geometry onto touch.

Crafting and pet parity slice:
- Ensure dispatcher actions can open and navigate crafting/professions and invoke existing server-authoritative craft commands through HUD/IWorld.
- Expose pet attack, stop, taunt, defensive, and aggressive actions using the same existing command seam and correct availability rules.
- Test ground-target, item slot, attack toggle, empty slot, pet absent/dead, crafting unavailable, cooldown, insufficient resource, and UI-blocked states.

Glyph and haptic slice:
- Create one contextual glyph resolver keyed by actual controller kind plus semantic input/action. Support Xbox, PlayStation, generic, keyboard/mouse fallback, remapped bindings, and unknown buttons without embedding presentation strings in gameplay logic.
- Update action bar, prompts, menus, radial/pages, crafting/pet affordances, and help to consume it. Semantic accessible labels name the action, not only the glyph.
- Create one best-effort haptic service behind settings and reduced-feedback/accessibility choices. Use event-driven cues for selected UI navigation/confirm/deny, damage, successful action, important loot/achievement, and other approved events only when a reliable local or authoritative event exists.
- Haptics never affect sim, network commands, timing, or success. Clamp duration/magnitude, debounce floods, cancel on suspend/disconnect, support unsupported actuators silently, and do not vibrate for sensitive text/auth entry.

INVARIANTS:
- NON-NEGOTIABLE: analog movement resolves in the shared deterministic sim and is validated by the authoritative server. Client visual speed cannot decide gameplay speed.
- NON-NEGOTIABLE: all three hosts and both `IWorld` implementations remain compatible; wire encode/decode and RL bindings change atomically when required.
- All 23 action slots are reachable, including held press/release semantics, with no stale action across mode/layer/disconnect transitions.
- Controller, keyboard, touch, clicked HUD, crafting, and pet behavior share semantic dispatch instead of drifting switches.
- Existing server authority for abilities, items, crafting, pets, targets, rewards, and economy remains unchanged.
- Analog values are finite and bounded; digital behavior remains full-speed; fixed 20 Hz sim and `Rng` rules remain intact.
- Glyphs and haptics are presentation-only, localized/accessibility-aware, best-effort, and non-authoritative.
- Generated i18n/assets are regenerated, not hand-edited. No production or external state mutation.

OUT OF SCOPE:
- New abilities/crafting recipes/pet mechanics, combat rebalance, aim assist that changes targeting authority, new controller hardware drivers, couch co-op expansion, EmulatorJS/Cartridge work, Store publication, and production deployment.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run:
- `npx vitest run tests/gamepad.test.ts tests/gamepad_controls.test.ts tests/gamepad_map.test.ts tests/move_input.test.ts`
- `npx vitest run tests/player_motion.test.ts tests/self_motion.test.ts tests/world_api_parity.test.ts tests/parity/harness.test.ts`
- `npx vitest run tests/env_protocol.test.ts tests/bandwidth.test.ts tests/snapshots.test.ts`
- `npx vitest run tests/hotbar.test.ts tests/action_bar_view.test.ts tests/action_bar_painter.test.ts tests/loadout_action_bar.test.ts`
- focused crafting/profession and pet tests named in Step 1
- new exhaustive slot/layer/radial/held-release/glyph/haptic tests
- real-browser synthetic and available physical-controller E2E for analog walk/run curve, slots 0 through 22, charge/release, item use, ground target, crafting, every pet action, modal interruption, disconnect/reconnect, glyph switching, and haptic fallback
- offline, online authoritative server, and headless/RL parity traces with identical input sequences
- `npx tsc --noEmit`
- wire size/bandwidth and 20 Hz load check
- i18n completeness/localization guard for visible strings

Test zero/deadzone/just-above/full/diagonal analog values, digital plus analog conflict, NaN/Infinity/out-of-range/missing/old-client frames, rapid direction change, mount/swim/fly/ghost/root/stun, reconnect and packet delay. Test every slot and action id, every layer edge, empty/disabled actions, remap collision, held modifier/slot release order, multiple pads, and haptic unsupported/rejected promises.

Dispatch cross-platform-sync and test-coverage reviewers. Add privacy-security if server/native/input-abuse surfaces match, qa-checklist when complete, migration-safety only for persisted shape/DDL, and frontend/accessibility if available for radial/glyph UX. Read instructions fully, request COVERAGE and structured BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT, and fix all BLOCKING and SHOULD-FIX items.

STEP 4 - COMMIT CADENCE:
- `feat(input): preserve analog movement magnitude`
- `feat(input): reach all controller action slots`
- `refactor(input): unify gameplay action dispatch`
- `feat(ui): add contextual controller feedback`
- `test(input): prove controller host parity`
Keep cross-host movement changes atomic even if the commit is larger. Stage exact paths only.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Analog magnitude is bounded, deterministic, server-authoritative, backward-safe, and identical offline, online, and headless.
- [ ] Digital keyboard/touch input remains full-speed and all movement states preserve their existing rules.
- [ ] Slots 0 through 22 are each reachable, visible, remappable, and correct for tap, hold, release, empty, disabled, cooldown, item, and ground-target states.
- [ ] Layer/page/radial transitions cannot leave modifiers or slots held and work across modal/text/suspend/disconnect/reconnect.
- [ ] One typed dispatcher covers gameplay/HUD/crafting/profession/pet actions with modality parity and server authority.
- [ ] Contextual glyphs reflect controller kind/remapping and retain semantic accessible labels.
- [ ] Haptics are configurable, debounced, clamped, best-effort, event-driven, silent when unsupported, and never affect outcomes.
- [ ] Offline, server, ClientWorld, headless/RL, wire, bandwidth, browser, i18n, accessibility, and input-regression tests pass.

STEP 6 - DOCS, STATE, AND MEMORY:
- Update packet progress/state/checklist with the MoveInput/wire schema, backward-compatibility rule, action registry, all-23-slot mapping, layer/radial state model, glyph/haptic tables, settings, tests, traces, browser artifacts, SHAs, reviewers, and Phase 05 QA handoff.
- Record durable parity and protocol decisions in memory if used.

STEP 7 - FINAL RESPONSE:
Report outcome, analog contract and parity evidence, all-23-slot mapping, dispatcher coverage, crafting/pet results, glyph/haptic behavior, files/commits, tests/traces/browser evidence, reviewers, OPEN hardware results, untouched external systems, and Phase 05 QA entrypoint.

STOPPING RULES:
- Stop if analog speed is client-only, unbounded, frame-dependent, or differs across offline/server/headless.
- Stop if any slot/action is unreachable, held input can stick, or action dispatch bypasses server authority.
- Stop rather than break old clients silently; use backward decoding or an explicit protocol gate.
- Do not mutate production, Store, or external services.
~~~
