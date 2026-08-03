# Phase 07 QA: Native Xbox Bridge and Hardware Lifecycle

### QA Starter Prompt

```text
This is Phase 07 QA of the Xbox Controller Platform feature: Verify Native Xbox Bridge and Hardware Lifecycle.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` for the full hardware and lifecycle adversarial-verify matrix.

Goal: Audit the native bridge for correctness, missing tests, dead code, mapping and lifecycle safety,
secret handling, hardware compatibility, web parity, determinism boundaries, three-host parity,
and i18n completeness, marking untouched sim/server/headless surfaces as verified not applicable.

STEP 0 - PRE-FLIGHT:
- Verify Phase 07 is committed. Record status and comparison commits; preserve unrelated dirty work
  and stop if overlapping paths are dirty.
- Scan memory, if used, for native bridge, WebView2, lifecycle, rumble, linking, and console notes.

STEP 1 - LOAD CONTEXT:
Spawn an Explore agent to summarize `state.md`, `progress.md`, `phase-07-native-xbox-bridge.md`,
the complete Phase 07 diff, root and relevant CLAUDE files, official research citations, changed tests,
and hardware evidence. Return every contract field, lifecycle transition, security boundary, acceptance
criterion, tested console, untested case, and known issue.

STEP 2 - QA AUDIT:
Spawn three parallel agents using the summary and demand COVERAGE, including low-severity and uncertain findings.

Correctness agent:
- Verify every standard mapping index, axis orientation, trigger value, timestamp rule, index 16 placeholder,
  pad identity, edge transition, ready handshake, reload path, add/remove path, suspend/resume path, and stale-state clear.
- Exercise zero to four pads, rapid reconnect, reordered devices, unsupported vibration, interrupted linking,
  expiry, cancel, retry, WebView recreation, Xbox One, and Xbox Series where hardware exists.
- Compare browser fallback and native results and verify no duplicate semantic input.

Test coverage agent:
- Add missing C# and TypeScript tests for every bridge and lifecycle branch, including malformed messages,
  partial capability data, analog boundaries, vibration cancellation, auth-link redaction, and unavailable APIs.
- Verify assertions check exact shape and transitions rather than only successful execution.
- Re-run sanitized hardware verification and retain reproducible evidence without identifiers or credentials.

Dead code and cleanup agent:
- Find duplicate listeners, stale timers, unused mappings, dead bridge messages, commented code, unbounded queues,
  unhandled async failures, package capability drift, logging leaks, and generated-file hand edits.
- Verify native time values do not enter sim determinism and the web renderer/UI still uses the intended seams.

Dispatch `privacy-security-review` for native/auth/package changes, `qa-checklist` for completion,
`cross-platform-sync` only if its exact surfaces changed, and `migration-safety` only for actual persistence.
Resume truncated reviewers with the standard BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT request.

STEP 3 - FIX AND VALIDATE:
- Fix all BLOCKING and SHOULD-FIX items and add regression tests.
- Run `npx tsc --noEmit`, affected gamepad/Xbox Vitest suites, shell C# tests, a clean UWP/MSIX build,
  and available Xbox One and Xbox Series hardware checks including suspend/resume and reconnect.
- Commit fixes separately with explicit paths and no `git add -A`.

STEP 4 - UPDATE DOCS + MEMORY:
- Mark Phase 07 QA in `progress.md`; update `state.md` with verified contracts, evidence,
  console matrix, security findings, and OPEN hardware/SDK limitations. Update memory if used.

STEP 5 - PACKET TEARDOWN:
Skip. Phase 07 is not the final phase.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; severity and fixed counts; security verdict;
hardware matrix; validation results; OPEN items; packet retained; and the Phase 08 handoff.

STOPPING RULES:
- Stop if a BLOCKING finding requires package identity, authentication authority, credentials, or Store changes.
- Do not pass with stuck input, duplicate input, secret leakage, unbounded rumble, or an undocumented hardware gap.
```
