# Phase 30: Integrate Exchange for One-to-Four-Player Checkpoint

## Purpose

Prove online server-authoritative Exchange and permanently local-only offline Exchange for
one to four players, including ordinary-market isolation and a decisive no-cross-boundary
contract, then checkpoint-promote only after QA PASS.

## Deliverables

- Run separate P1-P4 online server/DB-authoritative and offline local-profile-only Exchange
  matrices for projected inventory, list, browse, quote, reserve, buy, cancel, refund, fee,
  proceeds, delivery, disconnect/reload, and expiry across compatibility results.
- Run concurrent buyers, stale clients, process/DB failure, settlement recovery, audit/reconciliation, and money/item conservation.
- Verify prohibited gameplay stays disabled, ordinary realm markets remain isolated and
  functional, and offline state cannot sync/import/export/address any online identity,
  listing, escrow, money, or item.
- Prepare an immutable Exchange candidate and canary evidence for the separate QA session; that QA alone may issue PASS, promote/verify, or roll back.

### Starter Prompt

~~~text
This is Phase 30 of Cryptic Realm Recovery and Modernization: Integrate Exchange for One-to-Four-Player Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Prove separate P1-P4 online server-authoritative and offline local-only Exchange
contracts plus ordinary-market and cross-boundary isolation before QA promotion.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 29 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-30-exchange-integration-checkpoint.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- all Exchange phases
- scripts/market_mp_e2e.mjs
- co-op harness
- promotion control plane
- tmp/qa-loop artifacts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Run separate P1-P4 online server/DB and offline local-profile Exchange matrices across
  every registered compatibility result.
- Run concurrent buyers, stale clients, process/DB failure, settlement recovery, audit/reconciliation, and money/item conservation.

Integration/evidence agent:
- Verify prohibited gameplay, ordinary-market isolation, and decisive offline-to-online
  sync/import/export/identity/listing/escrow/money/item rejection.
- Prepare an immutable Exchange candidate and canary evidence for the separate QA session; that QA alone may issue PASS, promote/verify, or roll back.

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
- P1-P4 multi-realm Exchange/market matrix
- offline local-ledger reload/conservation and offline/online boundary matrix
- DB crash/recovery and conservation reconciliation
- stage canary/soak/screenshots/console

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
- test(exchange): complete coop settlement matrix
- chore(release): prepare exchange checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] P1-P4 cannot duplicate/lose items or money under any tested outcome.
- [ ] All disabled gameplay remains unreachable.
- [ ] Ordinary markets remain realm-local and green.
- [ ] Offline Exchange remains local-only/non-syncable and has no path into online identity,
  listings, escrow, money, items, or delivery.
- [ ] Dedicated PASS precedes promotion; failure triggers compatible rollback.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 30 QA handoff.

STOPPING RULES:
- Do not promote with unreconciled ledger variance.
- Do not use production non-QA rows during stage/proof.
~~~
