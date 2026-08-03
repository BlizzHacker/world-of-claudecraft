# Phase 03 QA: Verify the App-Lifetime Controller Foundation

### QA Starter Prompt

~~~text
This is Phase 03 QA of Xbox Controller Platform: Verify the App-Lifetime Controller Foundation.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use historical named harnesses only when actually available. Otherwise use bounded fresh Codex agents with a merge barrier. Never claim device or browser results that did not run.

Goal: Independently prove one controller service owns the complete app lifecycle, transitions deterministically among explicit UI modes, delegates through existing seams, and preserves all non-controller input.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read repository rules, packet state/progress/checklist, Phase 03 prompt, implementation commits, and full phase diff.
- Scan memory if available. Record branch, start/end SHAs, UTC timestamp, dirty paths, browser/tool versions, and concurrent work. Preserve unrelated changes.
- Confirm Phase 02 QA PASS and no external state mutation.

STEP 1 - EXPLORE CONTEXT:
Spawn a fresh Explore agent to trace controller construction, polling, mode transitions, dispatch, focus, cursor, text, lifecycle, settings, `enterWorld`, leave/reconnect, co-op pad ownership, and all keyboard/mouse/touch interactions across every changed file and named existing seam. Map each Phase 03 acceptance item to exact tests and report duplicate owners, unreachable transitions, stale references, and missing cleanup.

STEP 2 - ORCHESTRATE THE QA AUDIT:
Dispatch fresh independent agents for:
- State machine correctness: exhaustive transition table, priority/return behavior, illegal/stale events, reentrancy, rapid modal/text/suspend sequences, and world adapter replacement.
- Input ownership: one poller/dispatcher/focus/cursor owner, held-slot release, active-pad/co-op rules, and no direct sim mutation.
- Browser lifecycle: synthetic standard gamepad from page boot through landing, auth placeholder, realm/character placeholder, loading, gameplay, modal, cursor, text, visibility loss, disconnect/reconnect, leave, and re-entry.
- Regression: keyboard, mouse, pointer lock, touch router, mobile joysticks, focus visibility, screen reader semantics, and settings persistence.
- Dead code and cleanup: identify the superseded cursor/poller/dispatcher paths, stale listeners, unused modes/actions/imports, commented code, TODO/FIXME residue, and generated-file hand edits.

Use current browser state and local fixtures only. Treat every `pageerror` or unexpected console error during a core flow as FAIL.

INVARIANTS AND OUT OF SCOPE:
- One owner per controller concern; UI modes never affect deterministic sim state.
- Existing input modalities and accessibility remain first-class.
- Do not add Phase 04 onboarding UX or Phase 05 action layers while fixing QA unless a narrow foundation defect requires it.
- No production, Store, package, or external mutation.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run all Phase 03 focused tests plus exhaustive new mode/service tests and browser lifecycle E2E. Include empty/no-pad, unknown mapping, multiple pads, rapid connect/disconnect, page hidden during held action, focus trap replacement, cursor surface removal, text focus race, failed world entry, reconnect loop, leave/re-enter, disabled gamepad setting, and coexistence with touch/pointer.

Run `npx tsc --noEmit`, localization guard if needed, and focused architecture tests. Deliberately introduce and then revert regressions for stale held action and duplicate polling to prove tests are decisive.

Dispatch test-coverage review and `qa-checklist` when complete. Add cross-platform-sync only if shared host/wire surfaces changed and privacy-security only if auth/native/server boundaries changed. Read instructions completely, request COVERAGE and structured verdicts, and resolve all BLOCKING and SHOULD-FIX findings.

STEP 4 - FIX AND COMMIT CADENCE:
- `fix(input): close controller lifecycle qa gaps`
- `test(input): verify app-lifetime controller ownership`
Stage exact files only. Keep QA fixes separate and do not rewrite implementation history.

STEP 5 - QA ACCEPTANCE:
- [ ] One service instance and one poll loop span the app lifetime.
- [ ] Every legal transition and restoration path is tested; illegal/stale events fail safely.
- [ ] World replacement cannot retain stale `Hud`, `Input`, or `IWorld` adapters.
- [ ] Text/suspend/disconnect releases held gameplay actions and reconnect never replays edges.
- [ ] Focus, cursor, co-op pad ownership, settings, and controller bridge remain coherent.
- [ ] Keyboard, mouse, touch, pointer lock, mobile, and accessibility regressions are green.
- [ ] Real-browser boot-to-re-entry flow has no page or console errors.
- [ ] Reviewers report no BLOCKING or SHOULD-FIX items and no external state changed.

STEP 6 - DOCS, STATE, AND MEMORY:
- Bind a Phase 03 QA PASS or `STOPPED - <reason>` to exact implementation and QA commits in packet state/progress/checklist.
- Record transition coverage, browser screenshots/logs, input matrix, findings/fixes, reviewers, and Phase 04 prerequisites.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE:
Report PASS or STOPPED, service instance/ownership evidence, transition and regression coverage, browser result, findings/fixes/commits, reviewer verdicts, and whether Phase 04 may start.

STOPPING RULES:
- Duplicate owners, stale world references, gameplay during text entry, stuck held actions, or non-controller regressions are BLOCKING.
- Never weaken input arbitration or accessibility to make controller tests pass.
- Missing browser evidence is not a full PASS.
~~~
