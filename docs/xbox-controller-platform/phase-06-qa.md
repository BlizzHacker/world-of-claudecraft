# Phase 06 QA: HUD, Chat, Accessibility, and 10-Foot UX

### QA Starter Prompt

```text
This is Phase 06 QA of the Xbox Controller Platform feature: Verify HUD, Chat, Accessibility, and 10-Foot UX.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` for an exhaustive all-window and all-locale adversarial-verify Workflow.

Goal: Audit Phase 06 for correctness, missing tests, dead code, complete controller reachability,
focus and chat isolation, 10-foot accessibility, mobile behavior, determinism, three-host parity,
and i18n completeness, marking unchanged sim/server/headless surfaces as verified not applicable.

STEP 0 - PRE-FLIGHT:
- Verify the Phase 06 implementation is committed. Record `git status --short --branch` and the phase-start
  and phase-end commits. Preserve unrelated dirty work; stop if it overlaps Phase 06 paths.
- Scan memory, if used, for Phase 06 input, chat, focus, accessibility, and mobile notes.

STEP 1 - LOAD CONTEXT:
Spawn an Explore agent to summarize `state.md`, `progress.md`, `phase-06-hud-chat-accessibility.md`,
the complete Phase 06 diff, root `AGENTS.md`, relevant `src/game`, `src/ui`, `src/styles`, and `tests`
CLAUDE files, and all changed tests. Return every promised deliverable, file, focus transition,
input action, i18n key, visual script, acceptance criterion, and known issue.

STEP 2 - QA AUDIT:
Spawn three parallel agents with the Explore summary and prompt each for COVERAGE, including low-severity
and uncertain findings. Ranking happens after collection.

Correctness agent:
- Drive every shell, HUD, dialog, list, tab, slider, scroll area, map, and drag replacement using controller only.
- Verify focus trapping and restoration, cancel/back, input-mode changes, OSK open/close/cancel,
  disconnect/reconnect, empty/error states, rapid input, and one-action-one-command behavior.
- Prove chat mode cannot move, turn, attack, cast, or trigger actions and does not duplicate text or sends.
- Verify offline and online UI behavior is equivalent where applicable and gameplay authority is unchanged.

Test coverage agent:
- Map every new branch to a meaningful unit or browser assertion; add missing gamepad, chat, focus,
  scroll, drag-alternative, safe-area, and mobile regression tests.
- Exercise keyboard, mouse, touch, narrow phone, 1080p television, and overscan-safe layouts.
- Run relevant visual scripts and save screenshots for both controller and mobile behavior.

Dead code and cleanup agent:
- Find unused actions, listeners, imports, CSS selectors, focus sentinels, duplicate navigation logic,
  commented code, stale TODO/FIXME items, and generated-file hand edits.
- Verify `src/sim/` remains DOM-free and presentation still uses only `IWorld`.

Dispatch gated reviewers from the Phase 06 diff only. Use `qa-checklist`; use the other specialists only if
their exact `state.md` surface matches. Resume truncated reviewers with: "Stop reading more files. Output the
full report now. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."

STEP 3 - FIX AND VALIDATE:
- Fix every BLOCKING and SHOULD-FIX issue with focused tests.
- Run `npx tsc --noEmit`, all affected gamepad/chat/window/mobile suites,
  `npx vitest run tests/localization_fixes.test.ts`, `node scripts/gamepad_shot.mjs`,
  `node scripts/mobile_visual.mjs`, and affected mobile chat/safe-area scripts.
- Commit fixes separately using explicit paths. Never `git add -A`.

STEP 4 - UPDATE DOCS + MEMORY:
- Mark Phase 06 QA in `progress.md`; add verified focus, input-mode, copy, test, and evidence details to `state.md`.
- Record surprising rules in memory if used.

STEP 5 - PACKET TEARDOWN:
Skip. Phase 06 is not the final phase.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; finding counts by severity and fixed count; controller and mobile
evidence; deferred items; packet retained; and a one-line handoff to Phase 07.

STOPPING RULES:
- Stop if an unfixable BLOCKING issue requires scope expansion, gameplay changes, protocol changes, or production access.
- Do not pass while any normal flow is controller-inaccessible or chat leaks gameplay input.
```
