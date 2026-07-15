# Phase 22 QA: Verify and Execute Auditable DuranceTester Grant

### QA Starter Prompt

~~~text
This is Phase 22 QA of Cryptic Realm Recovery and Modernization: Verify and Execute Auditable DuranceTester Grant.

Model and harness: Codex, best available model, high/max reasoning. Opus 4.8 only when selectable. If Workflow is unavailable, use bounded generic-agent waves limited by the runtime's available worker slots, with adversarial verification.

Goal: Independently verify every Phase 22 deliverable and acceptance item before completion.

STEP 0 - PRE-FLIGHT:
- Verify implementation committed; record start/end SHAs and UTC timestamp; preserve unrelated work.
- Read progress/state/LEDGER/REPORT; never erase evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn Explore to summarize state, progress, inventory, checklist, phase-22-durancetester-grant.md, full diff, permanent guards, root AGENTS/CLAUDE and governing CLAUDE files. Return every deliverable/criterion, changed surface, flag, test, known issue, environment, and evidence gap.

STEP 2 - QA AUDIT:
Spawn fresh parallel agents.

Correctness:
- Verify target-neutral Git/logs, authenticate runtime owner input, and perform a read-only
  cardinality query for exact normalized name `durancetester`.
- Lock an explicit row/realm allowlist. Zero matches STOP; multiple matches STOP unless every
  intended row is explicitly allowlisted. After PASS, run once, retry the same key, verify no
  duplicate, and read back only the locked rows.
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
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any newly matched reviewer; request COVERAGE and structured verdict.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix BLOCKING/SHOULD-FIX; commit fixes separately with explicit paths.
- Re-run:
- focused entitlement/operator tests
- local and restored-fixture dry runs
- secret/target-data diff and log scan
- production read-only owner/name/cardinality preflight before the pre-operation PASS
- At checkpoints run npm run gate, npm run security:gate, and malware audit.
- Update REPORT fields exactly. Enforce QA names/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.
PRE-OPERATION BARRIER:
- Finish fixtures, dry-run, target-neutral scan, authenticated owner input, read-only
  cardinality preflight, and explicit row/realm scope lock first; then write dedicated PASS.
- Without PASS, perform no target-data mutation.
- After PASS only, invoke one allowlisted idempotent DuranceTester grant.
- Verify only the locked rows plus audit/retry behavior; revoke and STOP on any cardinality,
  realm, ownership, entitlement, or cost mismatch. Future rows are never implicitly granted.
- Store only minimum identifiers or keyed pseudonyms in an access-controlled retention-bound
  audit record. Never place plaintext target data in Git, CI, console/general logs, screenshots,
  or REPORT.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Complete only with evidence and dedicated verdict.
- Append LEDGER with timestamp/candidate/environment/failures/fixes/SHAs/validations/result/next.
- Update state/progress/inventory/permanent guards; externalize deferrals; record memory if used.

Step 5 is intentionally absent. It is reserved for Phase 48 packet teardown.

STEP 6 - FINAL RESPONSE FORMAT:
Report verdict, finding/fix counts, SHAs, validations, environment, QA artifacts, cleanup, promotion/operation/rollback, flags, deferrals, and Phase 23 handoff.

STOPPING RULES:
- Stop rather than weaken determinism, authority, privacy, migration, identity, or QA-before-mutation.
- Missing evidence is not PASS.
- Do not act before dedicated QA PASS or Phase 21 production health.
- Stop if account scope/name normalization matches any unintended row.
~~~
