# Phase 21: Integrate Mounts and Flight for Release Checkpoint

## Purpose

Prove three mounts and Emerald Wyrm flight for one to four players offline/online, then checkpoint-promote reviewed schema/code while leaving live tester data untouched.

## Deliverables

- Run all three mounts through unlock/summon/ride/dismount/death/reconnect/realm transition and persistence for P1-P4 offline/online.
- Run Emerald Wyrm ascent/descent/landing/no-fly/invalid/reconnect and mixed-altitude camera for P1-P4.
- Validate the complete Phase 17 entitlement operator, including runtime-owner authentication,
  exact normalization, row/realm allowlist, cardinality, fixed zero-cost bundle, idempotency,
  protected audit, and revoke, using generic and sanitized restored fixtures only.
- Prepare immutable code/schema candidate evidence for the separate QA session; that QA alone may issue PASS, promote/verify/roll back, and it performs no live grant action.

### Starter Prompt

~~~text
This is Phase 21 of Cryptic Realm Recovery and Modernization: Integrate Mounts and Flight for Release Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Prove three mounts and Emerald Wyrm flight for one to four players offline/online, then checkpoint-promote reviewed schema/code while leaving live tester data untouched.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 20 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-21-mount-flight-integration-checkpoint.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- mount/flight phases
- promotion control plane
- sanitized restored fixtures
- tmp/qa-loop artifacts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Run all three mounts through unlock/summon/ride/dismount/death/reconnect/realm transition and persistence for P1-P4 offline/online.
- Run Emerald Wyrm ascent/descent/landing/no-fly/invalid/reconnect and mixed-altitude camera for P1-P4.

Integration/evidence agent:
- Validate the complete Phase 17 entitlement operator using generic and sanitized restored
  fixtures only; Phase 22 may bind runtime inputs and execute this promoted command but cannot
  add executable operator code.
- Prepare immutable code/schema candidate evidence for the separate QA session; that QA alone may issue PASS, promote/verify/roll back, and it performs no live grant action.

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
- npm run gate
- npm run security:gate
- P1-P4 mount/flight matrix offline/online
- schema/wire canary
- stage realm/mixed-altitude soak

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- test(mounts): complete coop flight matrix
- chore(release): prepare mount checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] All three mounts work for P1-P4 and Emerald Wyrm true flight passes constraints.
- [ ] Schema/code and rollback are reviewed on local/restored fixtures.
- [ ] No target data appears in commits or pre-promotion operations.
- [ ] Dedicated QA PASS precedes code/schema promotion.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 21 QA handoff.

STOPPING RULES:
- Do not run the live tester grant.
- Do not activate mounts/flight on any realm whose post-deploy smoke fails.
~~~
