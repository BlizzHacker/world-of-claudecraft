# Phase 10 QA: Screenshots, Hardware, Release, and Packet Completion

### QA Starter Prompt

```text
This is Phase 10 QA of the Xbox Controller Platform feature: Verify Truthful Screenshots, Hardware QA,
WACK and Artifact Evidence, Certification Handoff, and Whole-Packet Completion.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` and run the whole-packet integration matrix as an adversarial-verify Workflow,
with each claimed PASS independently challenged by a skeptic agent.

Goal: Perform the final independent audit of Phase 10 and all cross-phase promises, fix all actionable
defects, prove the release candidate and evidence packet, and offer planning-packet teardown only after green convergence.

STEP 0 - PRE-FLIGHT:
- Verify Phase 10 implementation is committed. Record status, Phase 10 comparison commits, candidate artifact hash,
  and the phase-start snapshot. Preserve unrelated dirty work and stop if it overlaps audited paths.
- Scan memory, if used, for all Xbox controller platform phases, captures, hardware, Store, WACK, certification,
  shared-worktree care, and production restrictions.
- Confirm Phases 01 through 09 and their QA partners are marked complete or explicitly deferred with owners.

STEP 1 - LOAD CONTEXT:
Spawn Explore agents for packet promises, capture evidence, and release/hardware evidence. They summarize:
- `README.md`, `brainstorm.md`, `implementation-plan.md`, `progress.md`, `state.md`, `qa-checklist.md`
- Phase 01 through Phase 10 implementation and QA prompts
- The Phase 10 diff and relevant prior-phase commits needed to validate cross-phase integration
- All screenshot manifests/assets, capture scripts, hardware results, WACK reports, build logs,
  artifact hashes, Store/ID@Xbox evidence, certification handoff, citations, and OPEN items
- Root and every relevant CLAUDE file
Return a traceability table from each deliverable and acceptance criterion to code, test, evidence,
commit, current verdict, and any unresolved item. Do not accept `progress.md` status as proof.

STEP 2 - QA AUDIT:
Spawn parallel agents using the summaries and demand COVERAGE, including low-severity and uncertain findings.

Correctness and integration agent:
- Verify controller-only operation from cold launch, sign-in/OSK, realm and character flows, gameplay,
  all HUD/dialog/chat surfaces, EmulatorJS integration boundaries where referenced, suspend/resume,
  disconnect/reconnect, rumble, multi-pad, network loss, and clean exit.
- Verify browser/mobile parity and confirm UI changes did not alter authoritative gameplay or deterministic sim behavior.
- Re-run representative offline, online, and headless parity checks for any cross-platform surface changed by the packet.

Truthfulness and accessibility agent:
- Independently reproduce or inspect every screenshot scene and manifest field. Reject synthetic, composite,
  mislabeled, privacy-leaking, stale-build, inaccessible, or excluded-feature evidence.
- Verify party, arena, progression, gear, television legibility, focus visibility, overscan, contrast,
  reduced motion, safe areas, touch preservation, quick chat, OSK, and no movement leakage.
- Verify Romm screenshots were not modified.

Release and certification agent:
- Rebuild the exact Store-safe candidate from a clean source state and compare identity, version, architecture,
  contents, hashes, dependencies, feature exclusions, signing boundary, and reports.
- Re-run WACK and the available Xbox hardware matrix. Challenge warnings, skipped cases, generalized PASS results,
  policy claims, age rating, listing copy, public/search/acquisition status, and ID@Xbox readiness.
- Audit the certification handoff, rollback reference, smoke tests, privacy/support, moderation, identity/privilege plan,
  artifact index, and OPEN Microsoft/NDA dependencies.

Test coverage agent:
- Identify every new branch across Phases 01 through 10 without a meaningful test and add missing regression coverage.
- Verify assertions test exact mapping, lifecycle, exclusion, availability, capture, hardware, and artifact outcomes,
  including negative and error paths, rather than only successful execution.

Dead code and cleanup agent:
- Remove unused imports, stale listeners, dead mappings, obsolete flags, duplicate docs/assets, commented code,
  unresolved TODO/FIXME items, generated-file hand edits, debug output, dev commands, and secret-bearing artifacts.
- Verify import boundaries, server authority, deterministic sim rules, all-locale i18n, and no orphaned tests.

Dispatch gated specialist reviewers from the actual packet diff: `privacy-security-review` for matching security
surfaces, `migration-safety` for matching schema/state surfaces, `cross-platform-sync` for matching parity surfaces,
and `qa-checklist` for final completion. Ask each for COVERAGE. Resume truncation with: "Stop reading more files.
Output the full report now. No more tool calls. Format: BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT."

STEP 3 - FIX AND VALIDATE:
- Fix every BLOCKING and SHOULD-FIX item. Add decisive tests and rerun the affected evidence flow.
- Run `npm test && npx tsc --noEmit && npm run build:env && npm run build:server && npm run build`,
  `npm run asset:budget`, `npm run perf:tour`, Store-safe scans, screenshot validation, clean UWP/MSIX build,
  package inspection/hash comparison, WACK, available physical Xbox cases, and representative multiplayer scripts.
- Commit fixes separately with explicit paths. Never `git add -A`, deploy, publish, or commit secrets.

STEP 4 - UPDATE DOCS + MEMORY:
- Mark Phase 10 QA and the whole packet in `progress.md`; reconcile `state.md` and `qa-checklist.md` with actual
  code, tests, artifacts, evidence, hashes, reviewer verdicts, Store status, and OPEN follow-ups.
- Record surprising durable rules in memory if used. Ensure no follow-up exists only in a soon-to-be-deleted file.

STEP 5 - PACKET TEARDOWN:
This is the final phase. Only when all in-scope work is green:
- Surface every deferred follow-up, OPEN Microsoft/NDA/hardware item, owner, and durable destination first.
- Ask the user exactly for explicit confirmation to remove the planning scaffolding:
  "All phases are complete and green. OK to delete `docs/xbox-controller-platform/` before the PR?"
- If confirmed and committed, delete only that directory using
  `git rm -r docs/xbox-controller-platform/` and commit `docs: remove xbox controller platform planning scaffolding`.
- If never committed, remove only that exact directory. If declined, leave it intact. Never delete anything else
  and never `git add -A`.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; BLOCKING, SHOULD-FIX, and NICE-TO-HAVE counts and fixed counts;
whole-packet acceptance coverage; screenshot truthfulness; hardware matrix; build/WACK/artifact verdict;
Store and ID@Xbox status; deferred items; whether teardown was offered and performed; and `packet complete` when green.

STOPPING RULES:
- Stop if any BLOCKING item cannot be fixed without scope expansion, production mutation, secrets,
  inaccurate disclosure, legal acceptance, unsupported SDK access, or Store publication. Publication is a
  separate post-QA action and is not allowed inside this session.
- Do not pass while CI, WACK, Store-safe scans, artifact identity, truthful capture checks, an available required
  hardware case, privacy/security review, determinism, parity, or i18n is red.
- Never tear down the packet without explicit user confirmation after all follow-ups have durable homes.
```
