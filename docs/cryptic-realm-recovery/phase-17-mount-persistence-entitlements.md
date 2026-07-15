# Phase 17: Implement Mount Persistence and Target-Neutral Entitlements

## Purpose

Add additive mount ownership/state persistence and a generic least-privilege tester-entitlement model without committing target account or character data.

## Deliverables

- Add additive/idempotent/indexed mount ownership and state persistence with old-save round trips and forward-compatible rollback.
- Add a generic server-side entitlement scoped by runtime account identity plus exact normalized character-name token and allowlisted mount bundle.
- Lock normalization to the shared validated name function with exact DuranceTester fixture result durancetester, no fuzzy/prefix matching, and no committed target IDs/data.
- Build the complete authenticated dry-run-by-default grant/revoke/audit operator before any
  promotion: runtime-owner authentication, exact name normalization, explicit row/realm
  allowlist, fail-closed cardinality, fixed zero-cost three-mount bundle, idempotency, protected
  retention-bound audit identifiers, and no arbitrary inventory or dev-command capability.

### Starter Prompt

~~~text
This is Phase 17 of Cryptic Realm Recovery and Modernization: Implement Mount Persistence and Target-Neutral Entitlements.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Add additive mount ownership/state persistence and a generic least-privilege tester-entitlement model without committing target account or character data.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 16 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-17-mount-persistence-entitlements.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- server/db.ts
- character name validation/normalization
- operator/admin command patterns
- mount domain
- tests persistence patterns
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Add additive/idempotent/indexed mount ownership and state persistence with old-save round trips and forward-compatible rollback.
- Add a generic server-side entitlement scoped by runtime account identity plus exact normalized character-name token and allowlisted mount bundle.

Integration/evidence agent:
- Lock normalization to the shared validated name function with exact DuranceTester fixture result durancetester, no fuzzy/prefix matching, and no committed target IDs/data.
- Build the complete authenticated dry-run-by-default grant/revoke/audit operator: runtime-owner
  authentication, explicit row/realm allowlist, fail-closed cardinality, fixed zero-cost
  three-mount bundle, idempotency, and protected retention-bound audit identifiers. Keep target
  values out of Git, CI, console, general logs, screenshots, and REPORT.

INVARIANTS:
- Deterministic DOM-free 20 Hz sim; Rng only; no prohibited clocks/randomness.
- IWorld first; Sim and ClientWorld plus headless parity.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, entitlements.
- Additive/idempotent/indexed DDL; old saves; forward-data-safe rollback; versioned canary.
- Every-locale i18n and matcher coverage; controller/touch/mobile/accessibility.
- No secrets, personal/target data, unlicensed content, or production dev commands.
- Tests for new code; remove proven dead code; regenerate generated output.
- Explicit staging only; never git add -A.
- Append UTC LEDGER evidence and exact REPORT scenario fields when behavior is exercised.

OUT OF SCOPE:
- Production mutation/activation, later phases, unrelated cleanup, destructive history/schema/data, and unlocked product decisions.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- focused mount persistence/entitlement tests
- DDL twice and old-save round trips
- normalization confusable/whitespace/case fixtures
- dry-run/replay/revoke/concurrency tests
- npm run build:server

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(db): persist mount ownership
- feat(ops): add target neutral mount grants
- test(mounts): pin normalization and idempotency

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Old saves load and new mount state round-trips safely.
- [ ] Entitlement commits contain no target account ID, character ID, token, or live row.
- [ ] DuranceTester normalizes exactly to durancetester with no fuzzy expansion.
- [ ] Operator action is fully implemented before Phase 21 promotion: allowlisted, cardinality
  fail-closed, fixed-bundle, auditable, idempotent, least-privilege, and dry-run by default.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 17 QA handoff.

STOPPING RULES:
- Do not execute against production in this phase.
- Do not patch characters.state JSONB or add global dev commands.
~~~
