# Phase 03: App-Lifetime Controller Foundation

## Purpose

Replace world-entry-scoped controller wiring with one app-lifetime controller service that begins on the landing page and survives auth, realm, character, loading, gameplay, HUD, text-entry, suspension, and reconnect transitions. Consolidate action dispatch, focus navigation, and virtual cursor ownership while preserving keyboard, mouse, and touch behavior.

## Deliverables

- Add a single app-lifetime controller service with explicit modes and deterministic transition rules above `enterWorld`.
- Consolidate gamepad action dispatch, menu navigation, focus, cursor, text-entry, lifecycle, and connection ownership behind typed interfaces.
- Keep existing `Input`, `Hud`, `FocusManager`, `GamepadManager`, touch, keyboard, and mouse behavior through adapters rather than parallel implementations.
- Add pure mode/transition/dispatch tests and browser-level lifecycle tests covering boot through world exit and reconnect.

### Starter Prompt

~~~text
This is Phase 03 of Xbox Controller Platform: App-Lifetime Controller Foundation.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use Opus 4.8 or ultracode only if selectable in the active runtime. Otherwise request bounded Codex subagents explicitly, limited by available slots, and merge at a barrier with adversarial verification. Never claim unavailable tooling or device coverage.

Goal: Establish one typed controller service that exists for the full app lifetime, owns explicit controller modes and transitions, and delegates to existing focus, cursor, input, and action seams without regressing keyboard, mouse, or touch.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root `AGENTS.md`, root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `src/ui/CLAUDE.md`, `src/render/CLAUDE.md`, `src/net/CLAUDE.md`, `scripts/CLAUDE.md`, and `tests/CLAUDE.md` where present.
- Read packet README, brainstorm, implementation plan, progress, state, QA checklist, Phase 01 and 02 outcomes, and this file.
- Scan memory if available. Record branch, phase-start SHA, UTC timestamp, dirty paths, concurrent ownership, and the currently shipped controller behavior. Preserve unrelated work and stage explicit paths only.
- Require Phase 02 QA PASS. This phase changes controller architecture, not Store policy, server gameplay, production, or package publication.

STEP 1 - EXPLORE CONTEXT:
Spawn read-only Explore agents to map exact behavior and return concise summaries:

Controller and input:
- `src/game/gamepad.ts`, `src/game/gamepad_map.ts`, `src/game/gamepad_bindings.ts`, `src/game/gamepad_cursor.ts`, `src/game/menu_gamepad_nav.ts`, `src/game/input_activity.ts`
- `src/game/input.ts`, `src/game/mobile_controls.ts`, `src/game/touch_router.ts`, `src/game/pointer_lock.ts`, `src/game/chat_keyboard_dismiss.ts`, `src/game/settings.ts`, `src/game/xbox_env.ts`
- `shell/CrypticRealm.Shell/GamepadBridge.cs`, `shell/CrypticRealm.Shell/Assets/gamepad-polyfill.js`, and `scripts/verify_xbox_pad.mjs`

App and UI lifecycle:
- `src/main.ts`, especially current gamepad construction, `dispatchGamepadAction`, `enterWorld`, world exit, reconnect, page visibility, settings application, and `window.__game`
- `src/landing.ts`, `index.html`, and loading/start-screen transitions
- `src/ui/focus_manager.ts`, `src/ui/focus_order.ts`, `src/ui/window_focus.ts`, `src/ui/hud.ts`, `src/ui/options_window.ts`, and `src/ui/options_focus_model.ts`
- every current caller of `GamepadManager`, `GamepadCursor`, `handleMenuGamepadIntent`, `setGamepadMove`, `setTouchMove`, focus traps, vibration, and action dispatch

Tests and harnesses:
- `tests/gamepad.test.ts`, `tests/gamepad_controls.test.ts`, `tests/gamepad_map.test.ts`, `tests/menu_gamepad_nav.test.ts`, `tests/focus_manager.test.ts`, `tests/focus_order.test.ts`, `tests/focus.test.ts`, `tests/options_window_mobile_gamepad.test.ts`
- `tests/classic/landing-smoke.spec.ts`, `tests/browser/focus_indicator.browser.test.ts`, `scripts/gamepad_shot.mjs`, and browser test configuration

The report must include current construction/destruction timing, action routing, mode inference, focus/cursor ownership, controller connect/disconnect, active-pad selection, settings persistence, text-input behavior, visibility/suspend handling, world replacement, co-op interactions, duplicated dispatch logic, keyboard/touch dependencies, and oversized-file extraction seams. Identify exact tests to preserve. Do not propose direct `Sim` or `ClientWorld` access.

STEP 2 - ORCHESTRATE AND EXECUTE:
Use a bounded split. Give agents only the Explore summary and non-overlapping owned files. Keep one integration owner for `src/main.ts` because it is shared and large.

Pure service/model slice:
- Introduce a small module under `src/game/` for the app-lifetime controller service and a DOM-free mode reducer/model where practical.
- Define explicit modes covering at least `landing`, `auth`, `realmSelect`, `characterSelect`, `loading`, `gameplay`, `hudNavigation`, `virtualCursor`, `textEntry`, and `suspended`. Use exact names chosen from code, but do not collapse semantically distinct states into boolean inference.
- Define events and legal transitions for boot, screen/view changes, focus-trap open/close, text focus/blur, enter/leave world, reconnect, visibility, controller connect/disconnect, and Xbox native bridge readiness.
- Make transition order, priority, return mode, and stale-event handling testable. UI mode must never become authoritative gameplay state.

Adapters and dispatch slice:
- Move `dispatchGamepadAction` out of world-entry-local wiring into one typed dispatcher usable by all app modes. Unknown actions fail safely and are observable in development without throwing the app.
- Reuse `FocusManager` for trapped focus, `GamepadCursor` for pointer-like surfaces, `GamepadManager` for physical polling, and `Input` for gameplay movement. Do not create a second focus trap, cursor loop, or movement implementation.
- Define narrow adapters for landing/onboarding actions, gameplay actions, HUD/menu intents, text-entry requests, haptics, and lifecycle. Adapters may be absent until later phases and must degrade safely.
- Preserve held-slot release, pointer-lock release, active-pad ownership, deadzone/settings, and co-op pad reservation semantics.

App integration slice:
- Construct/start the service before landing interaction, not inside `enterWorld`. Update adapters as screens and worlds change; do not destroy/recreate the physical controller layer on each world entry.
- On leave, disconnect, reload, visibility loss, or navigation, release held actions and stale focus/cursor ownership without synthesizing gameplay actions.
- Expose a narrow read-only diagnostic surface through `window.__game` only where existing test conventions require it. Do not expose tokens or privileged methods.
- Retain keyboard, mouse, and touch event paths and interaction arbitration. Controller activity may change glyphs/focus, but must not permanently steal pointer or touch ownership.

INVARIANTS:
- The controller service is app-lifetime and exists before `enterWorld`; world objects are replaceable adapters.
- Exactly one owner exists for controller polling, action dispatch, mode state, virtual cursor, and focus-mode arbitration.
- Controller input expresses intent through existing `Input`, `Hud`, and `IWorld` seams. It never mutates `Sim`, `ClientWorld`, DOM-derived sim state, or server outcomes.
- Mode changes are UI/runtime state and never enter deterministic sim snapshots or persisted character state.
- Keyboard, mouse, touch, accessibility focus, mobile controls, and couch co-op continue to work.
- Text entry suppresses gameplay actions; suspend/disconnect releases held actions; reconnect does not replay stale edges.
- Every visible string uses i18n. Generated catalogs are regenerated, not hand-edited.
- No production, package, Store, or external state mutation.

OUT OF SCOPE:
- Full onboarding navigation details, OSK/device-code/QR implementation, 23-slot action layers, radial UI, new haptic event catalog, couch co-op expansion, EmulatorJS/Cartridge changes, server gameplay changes, Store publication, and production deployment.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run:
- `npx vitest run tests/gamepad.test.ts tests/gamepad_controls.test.ts tests/gamepad_map.test.ts tests/menu_gamepad_nav.test.ts`
- `npx vitest run tests/focus_manager.test.ts tests/focus_order.test.ts tests/focus.test.ts tests/options_window_mobile_gamepad.test.ts`
- new controller-mode/service tests for every legal transition, illegal/stale transitions, priority restoration, unknown actions, held release, disconnect/reconnect, visibility, text entry, world replacement, cursor ownership, and multiple pads
- real-browser controller lifecycle E2E from initial page through enter world, HUD/modal, leave world, and re-entry, collecting `pageerror` and console error as FAIL
- keyboard/mouse/touch regression smoke and couch co-op ownership smoke
- `npx tsc --noEmit`
- `npx vitest run tests/localization_fixes.test.ts` if visible text changes

Dispatch reviewers based on actual diff. Use cross-platform-sync if `IWorld`, net, sim, server wire, or host behavior changes; privacy-security only if auth/server/native secret boundaries change; test-coverage for implementation code; qa-checklist when deliverables are complete. Read selected reviewer instructions fully. Request COVERAGE with BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. Fix every BLOCKING and SHOULD-FIX issue before commit.

STEP 4 - COMMIT CADENCE:
- `refactor(input): add app-lifetime controller service`
- `refactor(input): unify controller action dispatch`
- `test(input): cover controller lifecycle modes`
Prefer small atomic commits. Stage exact paths only and never absorb concurrent changes.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] One controller service starts before landing interaction and survives world entry, exit, reconnect, and re-entry.
- [ ] Explicit typed modes and legal transitions cover landing through gameplay, HUD, cursor, text, and suspension.
- [ ] Action dispatch, mode ownership, focus navigation, and virtual cursor have one owner each.
- [ ] Gameplay routes through `Input`, `Hud`, and `IWorld`; no direct sim/client-world mutation exists.
- [ ] Disconnect, suspend, text entry, and world replacement release held/stale actions safely.
- [ ] Keyboard, mouse, touch, accessibility focus, and existing co-op pad ownership pass regression tests.
- [ ] Pure tests and real-browser lifecycle E2E pass with no console/page errors.
- [ ] No production, Store, package-publication, or external state changed.

STEP 6 - DOCS, STATE, AND MEMORY:
- Update packet progress/state/checklist with the mode/event table, owner/adapters, exact entrypoints, tests, browser artifacts, SHAs, reviewer verdicts, known gaps, and Phase 03 QA handoff.
- Document any intentional temporary no-op onboarding adapter for Phase 04 and gameplay-depth adapter for Phase 05.
- Record durable architectural memory if used.

STEP 7 - FINAL RESPONSE:
Report outcome, service/mode architecture, files and commits, adapter boundaries, tests/browser evidence, input regressions checked, reviewers, deferred Phase 04/05 adapters, untouched external systems, and the Phase 03 QA entrypoint.

STOPPING RULES:
- Stop if consolidation creates two polling loops, focus managers, cursors, action dispatchers, or movement paths.
- Stop if controller state leaks into sim/persistence, text entry can fire gameplay, or disconnect can leave a held action active.
- Stop before broad `src/main.ts` cleanup unrelated to extracting the controller seam.
- Do not mutate production, Store, packages, or external services.
~~~
