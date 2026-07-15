# Phase 06 QA: Verify Integrate Upstream Wire and Schema Compatibility

### QA Starter Prompt

~~~text
This is Phase 06 QA of Cryptic Realm Recovery and Modernization: Verify Integrate Upstream Wire and Schema Compatibility.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use bounded generic-agent waves with adversarial verification.

Goal: Independently verify every Phase 06 deliverable and acceptance item before it can be called complete.

STEP 0 - PRE-FLIGHT:
- Verify implementation is committed. Record phase-start/end SHAs and UTC timestamp.
- Inspect git status and preserve unrelated work.
- Read current progress/state and existing LEDGER/REPORT. Never erase prior evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to summarize state.md, progress.md, feature-inventory.md, qa-checklist.md, phase-06-upstream-wire-schema.md, full Phase 06 diff, permanent manifest/runbook if present, root AGENTS.md/CLAUDE.md, and governing area CLAUDE.md files.
Return every promised deliverable/acceptance item, changed file, new IWorld/event/wire/endpoint/DDL/i18n/asset/config, feature flag, test, known issue, environment profile, and evidence gap.

STEP 2 - QA AUDIT:
Spawn parallel fresh agents using only the Explore summary.

Correctness agent:
- Run both directions of client/server version skew.
- Interrupt schema boot and character save/load at each boundary.
- Exercise empty, boundary, malformed, retry, concurrency, reconnect, version-skew, and failure states.
- Verify no production mutation preceded QA PASS.

Test coverage agent:
- Read .claude/agents/test-coverage-auditor.md completely and audit decisive assertions/negative cases.
- Map every new branch, command, endpoint, query, IWorld member, event, wire field, persisted path, UI transform, operator/deploy state, and acceptance claim to tests.
- Prove protected tests fail on deliberate regression.

Dead-code and invariants agent:
- Find duplicates, stale shims, unused imports/types/helpers, orphaned tests, comments, hand-edited generated files, private-data leaks, and forbidden sim imports/clocks/randomness.
- Remove only proven replacements and preserve user work.

Diff-gated specialists:
- Build the reviewer set from the implementation/QA diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and dispatch a fresh generic read-only subagent.
- Add any reviewer newly matched by the actual diff.
- Request COVERAGE and structured BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix every BLOCKING and SHOULD-FIX item; commit QA fixes separately with explicit paths.
- Run every Phase 06 validation again:
- npx vitest run tests/snapshots.test.ts tests/env_protocol.test.ts tests/bandwidth.test.ts
- old-save and DDL-twice fixtures
- rolling-version canary matrix
- npm run build:server
- npm run build:env
- Run npm run gate at every release checkpoint, plus npm run security:gate and contextual malware audit.
- Update REPORT scenarios with id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Enforce QA naming/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Mark Phase 06 QA complete only with evidence for every criterion and a dedicated verdict.
- Append LEDGER with timestamp, candidate, environment, failures, fixes/SHAs, validations, result, next action.
- Update state/progress/inventory/permanent guards and move durable deferrals to normal tracking.
- Record memory if used.

Step 5 is intentionally absent. It is reserved for packet teardown in Phase 48 QA.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; finding/fix counts; SHAs; validations; environment; LEDGER/REPORT state; cleanup; promotion/operation/rollback result when applicable; feature flags; deferrals; and handoff to Phase 07.

STOPPING RULES:
- Stop if a blocker requires weakening determinism, authority, privacy, migration, environment identity, or QA-before-mutation ordering.
- Stop if evidence is missing; never infer PASS.
- Do not ship an unversioned incompatible wire change.
- Do not add a destructive rollback migration.
- Do not approve MERGE_HEAD or unresolved index state; Phase 07 owns the final true merge.
~~~
