# Phase 05 QA: Verify Gameplay Controller Depth

### QA Starter Prompt

~~~text
This is Phase 05 QA of Xbox Controller Platform: Verify Gameplay Controller Depth.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use named historical harnesses only when actually available. Otherwise use bounded fresh Codex agents with a merge barrier and adversarial verification. Never claim hardware, multiplayer, or headless evidence that did not run.

Goal: Independently prove analog movement parity and authority, complete access to all 23 action slots, correct dispatcher/crafting/pet semantics, and accessible glyph/haptic feedback.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read repository rules, packet state/progress/checklist, Phase 05 prompt, protocol/action tables, implementation commits, and full diff.
- Scan memory if available. Record branch, start/end SHAs, UTC timestamp, dirty paths, protocol versions, local server/headless/browser environments, and available controller hardware. Preserve unrelated work.
- Confirm Phase 04 QA PASS and zero production/Store mutation.

STEP 1 - EXPLORE CONTEXT:
Spawn a fresh Explore agent to trace analog input from physical/synthetic pad through deadzone, Input, MoveInput sanitize/encode, ClientWorld, server parse/anti-cheat, shared sim movement, offline/headless/RL, and observations. Separately map every action id, slot 0 through 22, layer/radial transition, press/release, crafting/profession/pet path, glyph consumer, haptic source, setting, and test. Return parity gaps, stale switch branches, malformed-input risks, unreachable actions, and unsupported evidence.

Use current primary-source research to revalidate Gamepad haptic and controller-kind claims. Mark unavailable hardware behavior OPEN, never PASS by inference.

STEP 2 - ORCHESTRATE THE QA AUDIT:
Use independent agents for:
- Analog correctness, determinism, and authority: property and trace tests across offline, server, ClientWorld, headless/RL, old/new frames, malformed values, and fixed tick.
- Action reachability: mechanically enumerate slots 0 through 22 and every typed action, then exercise tap/hold/release, layer/page/radial, remapping, interruption, and reconnect.
- Domain parity: compare controller, keyboard, touch, clicked HUD for abilities/items/ground aim plus crafting/profession and all pet actions.
- Presentation/accessibility: controller-kind/remap glyphs, semantic labels, radial/page focus, color/scale/safe area, haptic settings/debounce/fallback, and reduced-feedback behavior.
- Performance/wire: input size/rate, signature changes, allocation, browser frame cost, server validation, and abuse cases.
- Dead code and cleanup: identify unreachable binding actions, obsolete slot adapters, duplicate mapping logic, stale haptic paths, unused protocol fields, commented code, TODO/FIXME residue, and generated-file hand edits.

Run local only. Use namespaced QA accounts/characters for online crafting/pet scenarios and clean them up.

INVARIANTS AND OUT OF SCOPE:
- Shared deterministic sim and authoritative server decide movement/actions. All hosts and wire/RL surfaces stay in lockstep.
- No new game balance/content, aim authority, co-op expansion, Cartridge work, production deployment, or Store mutation.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run the complete Phase 05 command matrix plus broad affected regression tests. Use property/boundary cases for analog zero, deadzone edge, full scale, diagonals, conflict, NaN/Infinity, packet loss/reorder, reconnect, mount/swim/fly/ghost/root/stun, old clients, and headless action vectors. Compare deterministic traces at fixed seed/ticks.

Mechanically assert all 23 slot ids are generated, displayable, selectable, dispatchable, and releasable. Cover charge actions, items, empty/disabled/cooldown/resource/range/ground-target states, every modifier ordering, remap conflicts, modal/text/suspend/disconnect, multiple pads, crafting unavailable/success/failure, and pet absent/dead/all commands.

Run real-browser controller scenarios and collect screenshots, accessibility state, page errors, console errors, and performance. Exercise available physical hardware separately from synthetic pads. Unsupported haptics must no-op without errors; supported hardware claims require observed evidence.

Run `npx tsc --noEmit`, i18n gates, snapshots/env protocol/bandwidth tests, full cross-host parity tests, security gate, and `npm test` at the integration checkpoint. Prove decisive tests fail under deliberate local regressions for client-only magnitude, missing wire clamp, unreachable slot22, lost release, dispatcher drift, and haptic rejection, then revert only deliberate mutations.

Dispatch cross-platform-sync, test-coverage, and qa-checklist reviewers. Add privacy-security for matched server/native abuse surfaces, migration-safety for persisted changes, and frontend/accessibility when available. Read instructions fully, request COVERAGE with BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT, and fix all BLOCKING and SHOULD-FIX findings.

STEP 4 - FIX AND COMMIT CADENCE:
- `fix(input): close analog parity qa gaps`
- `fix(input): close controller action coverage gaps`
- `test(input): verify gameplay controller depth`
Stage exact files only. Keep QA fixes reviewable and separate from unrelated work.

STEP 5 - QA ACCEPTANCE:
- [ ] Identical analog sequences produce identical movement across offline, authoritative server, ClientWorld prediction/mirroring, and headless/RL within defined deterministic tolerances.
- [ ] Malformed, spoofed, old, delayed, and out-of-range frames are safe and bandwidth/rate limits remain valid.
- [ ] Every slot 0 through 22 and every typed action passes reachability plus tap/hold/release/interruption tests.
- [ ] Controller behavior matches keyboard/touch/click semantics for abilities, items, ground aim, crafting/professions, and pet commands.
- [ ] Glyphs are correct for kind/remapping and accessible without glyph recognition.
- [ ] Haptics are correct, optional, bounded, debounced, cancellation-safe, and harmless when unsupported.
- [ ] Browser, performance, i18n, security, full tests, reviewers, and QA cleanup pass.

STEP 6 - DOCS, STATE, AND MEMORY:
- Bind Phase 05 PASS or `STOPPED - <reason>` to exact implementation/QA commits, protocol schema, test traces, artifact/browser environment, and reviewer verdicts.
- Update packet state/progress/checklist with matrix results, screenshots/logs, findings/fixes, QA account cleanup, hardware OPEN items, and Phase 06 prerequisites.
- Record durable protocol/action decisions in memory if used.

STEP 7 - FINAL RESPONSE:
Report PASS or STOPPED, analog cross-host verdict, 23-slot/action coverage, crafting/pet parity, glyph/haptic evidence, performance/wire result, findings/fixes/commits, reviewers, cleanup, OPEN hardware limits, and whether Phase 06 may begin.

STOPPING RULES:
- Cross-host movement mismatch, server bypass, malformed-input instability, unreachable slot, stuck held action, modality/domain drift, or false hardware claim is BLOCKING.
- Missing headless/server/browser evidence is not a full PASS.
- Never weaken determinism, authority, validation, accessibility, or tests to manufacture success.
~~~
