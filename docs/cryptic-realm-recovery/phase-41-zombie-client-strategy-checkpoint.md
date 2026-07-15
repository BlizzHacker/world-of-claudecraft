# Phase 41: Implement Zombie Client and Strategy Checkpoint

## Purpose

Build P1-P4 zombie-defense presentation, prove both strategy games offline/online, and checkpoint-promote only after dedicated QA PASS.

## Deliverables

- Implement P1-P4 tower placement/upgrades, wave/objective/resource HUD, controls, camera, warning cues, render/audio, accessibility, and mobile behavior.
- Run P1-P4 offline/online zombie build/fight/upgrade/reconnect/defeat/restart/reward and maximum-wave soak.
- Re-run P1-P4 Eastbrook/Highwatch RTS persistence/ACL/win/loss plus zombie integration with screenshots, console, tick/snapshot/render budgets.
- Prepare an immutable strategy candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.

### Starter Prompt

~~~text
This is Phase 41 of Cryptic Realm Recovery and Modernization: Implement Zombie Client and Strategy Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Build P1-P4 zombie-defense presentation, prove both strategy games offline/online, and checkpoint-promote only after dedicated QA PASS.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 40 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-41-zombie-client-strategy-checkpoint.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- RTS/zombie phases
- co-op harness
- promotion pipeline
- tmp/qa-loop artifacts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Implement P1-P4 tower placement/upgrades, wave/objective/resource HUD, controls, camera, warning cues, render/audio, accessibility, and mobile behavior.
- Run P1-P4 offline/online zombie build/fight/upgrade/reconnect/defeat/restart/reward and maximum-wave soak.

Integration/evidence agent:
- Re-run P1-P4 Eastbrook/Highwatch RTS persistence/ACL/win/loss plus zombie integration with screenshots, console, tick/snapshot/render budgets.
- Prepare an immutable strategy candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.

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
- P1-P4 strategy matrix
- npm run asset:budget
- npm run perf:tour
- stage max-wave soak/screenshots/console

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(defense): add coop client
- test(strategy): complete four-player matrix
- chore(release): prepare strategy checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Both strategy modes pass for P1-P4 offline/online.
- [ ] Persistence, ACL, rewards, determinism, and load remain correct.
- [ ] No console/license/authority failure remains.
- [ ] PASS precedes promotion and failure rolls back.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 41 QA handoff.

STOPPING RULES:
- Do not promote one strategy system without the other coherent checkpoint.
- Do not leave QA campaigns/accounts in production.
~~~
