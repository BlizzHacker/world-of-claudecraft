# Phase 48: Complete Final Hardening and Automatic Release

## Purpose

Prepare the exact final candidate and complete local/stage regression, feature, security,
performance, and realm evidence for an independent QA session. This implementation phase
does not issue PASS or mutate production.

## Deliverables

- Run permanent manifest, latest-stable drift check, npm run gate, npm run security:gate, release malware audit, schema/wire canary, asset/performance, dependency, privacy, migration, parity, and clean QA artifact gates.
- Run login, character create, enter world, movement, target/autoattack/cast, loot, quests, full chat/social/trade/duel/markets/talents plus every P1-P4 co-op/mount/flight/fishing/Exchange/minigame/strategy/housing/distribution scenario on local/stage.
- Prepare a complete draft REPORT with scenario fields, fixes-with-SHAs, prioritized
  follow-ups, screenshots/console/account cleanup, and the evidence needed for independent
  QA to write the exact CONVERGED line and dedicated pre-promotion PASS.
- Prepare the exact immutable final candidate for the separate QA session; that QA alone may issue PASS, invoke backup/promotion, verify every production realm, or roll back.

### Starter Prompt

~~~text
This is Phase 48 of Cryptic Realm Recovery and Modernization: Complete Final Hardening and Automatic Release.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Prepare the exact final candidate and complete local/stage regression, feature,
security, performance, and realm evidence for independent Phase 48 QA. Do not issue PASS
or mutate production in this implementation session.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 47 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-48-final-hardening-release.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- all phases
- permanent recovery artifacts
- tmp/qa-loop/LEDGER.md
- tmp/qa-loop/REPORT.md
- promotion control plane
- all realm/stage inventories
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Run permanent manifest, latest-stable drift check, npm run gate, npm run security:gate, release malware audit, schema/wire canary, asset/performance, dependency, privacy, migration, parity, and clean QA artifact gates.
- Run login, character create, enter world, movement, target/autoattack/cast, loot, quests, full chat/social/trade/duel/markets/talents plus every P1-P4 co-op/mount/flight/fishing/Exchange/minigame/strategy/housing/distribution scenario on local/stage.

Integration/evidence agent:
- Prepare a complete draft REPORT with scenario fields, fixes-with-SHAs, prioritized
  follow-ups, screenshots/console/account cleanup, and evidence for independent QA to write
  the exact CONVERGED line and dedicated pre-promotion PASS.
- Prepare the exact immutable final candidate for the separate QA session; that QA alone may issue PASS, invoke backup/promotion, verify every production realm, or roll back.

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
- npm run asset:budget
- npm run perf:tour
- complete P1-P4 local/stage matrix
- schema/wire canary and restore rehearsal
- stage-only rollback injection; production verification and automatic rollback belong to
  the independent QA session and never use injected production failures

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
- fix(release): close recovery findings
- chore(release): prepare final cryptic candidate

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every in-scope local/stage scenario has evidence and no unresolved FAIL; the draft
  REPORT explicitly withholds CONVERGED and pre-promotion PASS for independent QA.
- [ ] The exact candidate, artifact checksums, environment profile, backup, rollback ref,
  and stage rollback proof are immutable and ready for QA review.
- [ ] This implementation session performs zero production mutation.
- [ ] Phase 48 QA has an exact handoff for production verification and automatic rollback.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 48 QA handoff.

STOPPING RULES:
- Stop before promotion on any red/missing/stale gate or unclean REPORT.
- Do not issue PASS, promote, or inject production failures from this implementation phase.
~~~
