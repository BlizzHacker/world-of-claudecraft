# Phase 08 QA: Cartridge and EmulatorJS Controller Reliability

### QA Starter Prompt

```text
This is Phase 08 QA of the Xbox Controller Platform feature: Verify Cartridge and EmulatorJS Controller Reliability.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` to run the representative core and lifecycle matrix as an adversarial-verify Workflow.

Goal: Audit both Romm repositories for correctness, missing tests, dead code, reliable controller lifecycle,
explicit EmulatorJS mappings, exit-chord containment, safe overlay operations, determinism boundaries,
three-host parity impact, i18n completeness, and preservation of prior work, marking Cryptic-only gates not applicable.

STEP 0 - PRE-FLIGHT:
- In both Romm repositories, verify Phase 08 commits exist and record status plus comparison commits.
- Do not require a globally clean RommStreamServer tree. Preserve documented pre-existing dirty work and stop
  only if the Phase 08 diff cannot be separated from it.
- Scan memory, if used, for Cartridge, EmulatorJS, ready handshake, exit chord, core matrix, and dirty-work notes.

STEP 1 - LOAD CONTEXT:
Spawn one Explore agent per Romm repository to summarize the Phase 08 implementation prompt, `progress.md`,
`state.md`, each repository diff, instructions, changed tests, prior dirty-work provenance, and primary-source
EmulatorJS research. Return every deliverable, protocol field, mapping, lifecycle transition, core case,
acceptance criterion, known issue, and exact test command.

STEP 2 - QA AUDIT:
Spawn three parallel agents using the summaries and demand COVERAGE, including low-severity and uncertain findings.

Correctness agent:
- Prove ready plus forced full-state resend for cold start, controller-preconnected launch, every navigation,
  reload, emulator start, WebView recreation, visibility loss, suspend/resume, disconnect, and reconnect.
- Verify mapping indices, analog values, multiple pads, no duplicate edges, and no stuck inputs.
- Trace Menu+View end to end and prove both buttons are suppressed from every representative core while the
  overlay opens exactly once. Exercise Resume, Save, Load, Exit, cancellation, latency, and errors.

Test coverage agent:
- Add missing shell, JavaScript, Python, and representative-core tests for every new branch and failure path.
- Ensure `EJS_defaultControls` assertions check exact mappings for each player and representative core family.
- Test legally available content only and record versions and limitations precisely.

Dead code and cleanup agent:
- Find duplicate listeners, stale queues, unused mappings, implicit default fallbacks, dead overlay code,
  unsafe save paths, tenant leaks, unhandled errors, unrelated formatting, and accidental inclusion of prior dirty work.
- Verify no deploy or production configuration mutation is hidden in the diff.

Dispatch `privacy-security-review` for server/session/save/auth/deploy surfaces and `qa-checklist` for completion.
Dispatch other specialists only if their exact surfaces match. Resume truncated reviewers with the standard
BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT instruction.

STEP 3 - FIX AND VALIDATE:
- Fix all BLOCKING and SHOULD-FIX findings without overwriting prior work.
- Run all relevant RommForXbox shell, JavaScript, Python, URL routing, core validation, RommStreamServer Pytest,
  and EmulatorJS matrix checks. Repeat the lifecycle and overlay E2E matrix.
- Commit fixes per repository with explicit paths, separate from verdict docs. Never `git add -A`, push, or deploy.

STEP 4 - UPDATE DOCS + MEMORY:
- Mark Phase 08 QA complete in Cryptic Realm `progress.md`; update `state.md` with verified commits, mappings,
  core results, provenance, security conclusions, and deferrals. Update memory if used.

STEP 5 - PACKET TEARDOWN:
Skip. Phase 08 is not the final phase.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL per repository; finding and fixed counts; core matrix;
dirty-work preservation; security verdict; no-deploy confirmation; deferred items; and the Phase 09 handoff.

STOPPING RULES:
- Stop if any BLOCKING issue needs deployment, secrets, ROM acquisition, scope expansion, or destructive handling of dirty work.
- Do not pass with implicit mappings, stuck input, duplicate input, an unsuppressed exit chord, or unsafe save/load authorization.
```
