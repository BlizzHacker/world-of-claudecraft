# Phase 46 QA: Verify Offline Realm Persistence Parity and Migration Hardening

### QA Starter Prompt

~~~text
This is Phase 46 QA of Cryptic Realm Recovery and Modernization: Verify Offline Realm Persistence Parity and Migration Hardening.

Model and harness: Codex, best available model, high/max reasoning. Opus 4.8 only when selectable. If Workflow is unavailable, use bounded generic-agent waves limited by the runtime's available worker slots, with adversarial verification.

Goal: Independently verify every Phase 46 deliverable and acceptance item before completion.

STEP 0 - PRE-FLIGHT:
- Verify implementation committed; record start/end SHAs and UTC timestamp; preserve unrelated work.
- Read progress/state/LEDGER/REPORT; never erase evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn Explore to summarize state, progress, inventory, checklist, phase-46-offline-realm-persistence-recovery.md, full diff, permanent guards, root AGENTS/CLAUDE and governing CLAUDE files. Return every deliverable/criterion, changed surface, flag, test, known issue, environment, and evidence gap.

STEP 2 - QA AUDIT:
Spawn fresh parallel agents.

Correctness:
- Recompute the parity matrix for `b4a1f594`, `854615ab`, and exact duplicate-realm-entry fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1` against the Phase 11/14 foundation; verify every delta has an evidence-backed disposition.
- Load legacy/corrupt/partial stores and switch realms repeatedly.
- Verify P1-P4 state survives reload/delete/import boundaries through the existing member identity, realm registry, transition, and persistence owners; fail any parallel implementation.
- Reconstruct the exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` regression and prove reload, migration, import, and repeated realm switching cannot produce a duplicate realm entry.
- Prove profile import/export rejects or strips Offline Exchange ledger state and cannot create
  online identities, listings, escrow, money, or items.
- Exercise empty, boundary, malformed, retry, concurrency, reconnect, skew, and failure states.
- Verify no production mutation preceded QA PASS.

Test coverage:
- Read .claude/agents/test-coverage-auditor.md completely.
- Map every branch/API/query/IWorld/event/wire/persistence/UI/operator/deploy state and claim to decisive positive/negative tests.
- Prove tests fail on deliberate regression.

Dead code/invariants:
- Find duplicates, stale shims, unused code/tests, generated edits, data leaks, forbidden sim imports/clocks/randomness.
- Remove only proven replacements.

Diff-gated specialists:
- Build the reviewer set from the implementation/QA diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any newly matched reviewer; request COVERAGE and structured verdict.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix BLOCKING/SHOULD-FIX; commit fixes separately with explicit paths.
- Re-run:
- focused offline realm persistence tests
- legacy/corrupt storage fixtures
- exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` duplicate-realm-entry fixture across reload, migration, import, and repeated realm switching
- P1-P4 realm switch browser E2E
- npx tsc --noEmit
- At checkpoints run npm run gate, npm run security:gate, and malware audit.
- Update REPORT fields exactly. Enforce QA names/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Complete only with evidence and dedicated verdict.
- Append LEDGER with timestamp/candidate/environment/failures/fixes/SHAs/validations/result/next.
- Update state/progress/inventory/permanent guards; externalize deferrals; record memory if used.

Step 5 is intentionally absent. It is reserved for Phase 48 packet teardown.

STEP 6 - FINAL RESPONSE FORMAT:
Report verdict, finding/fix counts, SHAs, validations, environment, QA artifacts, cleanup, promotion/operation/rollback, flags, deferrals, and Phase 47 handoff.

STOPPING RULES:
- Stop rather than weaken determinism, authority, privacy, migration, identity, or QA-before-mutation.
- Missing evidence is not PASS.
- Do not overwrite unknown user storage without backup/version check.
- Do not merge offline state into online authoritative records.
- A missing Phase 11/14 dependency, duplicate realm registry/persistence owner, or failure of the exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` regression is FAIL.
~~~
