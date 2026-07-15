# Phase 04 QA: Verify Build QA-Gated Promotion and Rollback Control Plane

### QA Starter Prompt

~~~text
This is Phase 04 QA of Cryptic Realm Recovery and Modernization: Verify Build QA-Gated Promotion and Rollback Control Plane.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use bounded generic-agent waves with adversarial verification.

Goal: Independently verify every Phase 04 deliverable and acceptance item before it can be called complete.

STEP 0 - PRE-FLIGHT:
- Verify implementation is committed. Record phase-start/end SHAs and UTC timestamp.
- Inspect git status and preserve unrelated work.
- Read current progress/state and existing LEDGER/REPORT. Never erase prior evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to summarize state.md, progress.md, feature-inventory.md, qa-checklist.md, phase-04-promotion-control-plane.md, full Phase 04 diff, permanent manifest/runbook if present, root AGENTS.md/CLAUDE.md, and governing area CLAUDE.md files.
Return every promised deliverable/acceptance item, changed file, new IWorld/event/wire/endpoint/DDL/i18n/asset/config, feature flag, test, known issue, environment profile, and evidence gap.

STEP 2 - QA AUDIT:
Spawn parallel fresh agents using only the Explore summary.

Correctness agent:
- Prove production mutation is impossible before QA_PASS using negative tests and audit logs.
- Prove each promotion has an immutable private Git ref or verified private bundle publication, a verified rollback ref, successful DB and runtime-config backup/restore evidence, and passing retention checks before QA_PASS.
- Verify a related-LXC stage is used only when its exact identity is manifest-pinned and verified; when none exists, verify an exact-artifact isolated ephemeral stage with sanitized QA-only data, no production credentials or external side effects, dev cheats OFF, and recorded identity. Verify cleanup/reset before retaining an existing stage and teardown before closing an ephemeral stage.
- Simulate global and per-realm deployment failures only in isolated stage and verify
  all-or-nothing compatible rollback; never inject production failures.
- Fail every stage provisioning, identity, isolation, smoke, cleanup, and teardown boundary and prove each failure halts before production mutation.
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
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and dispatch a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and dispatch a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer newly matched by the actual diff.
- Request COVERAGE and structured BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix every BLOCKING and SHOULD-FIX item; commit QA fixes separately with explicit paths.
- Run every Phase 04 validation again:
- npx vitest run tests/promotion_pipeline.test.ts tests/promotion_rollback.test.ts tests/environment_identity.test.ts tests/stage_environment.test.ts
- systemd-analyze verify on changed units
- isolated local/stage failure injection at every state, including schema/wire canary and
  partial-realm failure; production is observation-only except for automatic rollback
- exercise the verified manifest-pinned related-LXC path and the isolated ephemeral fallback; prove exact-artifact identity, sanitized data, blocked production credentials/webhooks/PR effects, dev cheats OFF, cleanup/teardown, and halt-on-failure behavior
- verify immutable private source recovery, DB/runtime-config backup restore drills, rollback ref, and retention evidence all precede QA_PASS
- npm run gate
- npm run security:gate
- Run npm run gate at every release checkpoint, plus npm run security:gate and contextual malware audit.
- Update REPORT scenarios with id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Enforce QA naming/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Mark Phase 04 QA complete only with evidence for every criterion and a dedicated verdict.
- Append LEDGER with timestamp, candidate, environment, failures, fixes/SHAs, validations, result, next action.
- Update state/progress/inventory/permanent guards and move durable deferrals to normal tracking.
- Record memory if used.

Step 5 is intentionally absent. It is reserved for packet teardown in Phase 48 QA.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; finding/fix counts; SHAs; validations; environment; LEDGER/REPORT state; cleanup; promotion/operation/rollback result when applicable; feature flags; deferrals; and handoff to Phase 05.

STOPPING RULES:
- Stop if a blocker requires weakening determinism, authority, privacy, migration, environment identity, or QA-before-mutation ordering.
- Stop if evidence is missing; never infer PASS.
- Do not use destructive down-migrations during rollback.
- Stop before production mutation on any red or missing private-source recovery, DB/runtime-config restore, retention, stage identity, isolation, smoke, cleanup, or teardown evidence.
~~~
