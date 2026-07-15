# Phase 26: Lock Exchange Economy, Visitor, and Authority Policy

## Purpose

Define the complete Exchange Realm authority model before schema or UI work.

## Deliverables

- Lock denomination to the existing integer copper-equivalent money unit, no floating point or FX; reserve buyer funds server-side and enforce conservation: reservation equals seller proceeds plus successful-settlement fee plus refund remainder.
- Lock item custody/provenance/compatibility/idempotency and projected inventory as a non-owning view of source escrow, never a copied character inventory; generate an explicit eligibility/compatibility policy for every registered source and destination realm.
- Define time-bound authenticated online visitor/delivery leases and mechanically disable
  combat, quests, mail, progression, ordinary local markets, loot, XP, and non-Exchange
  rewards for Exchange visitors.
- Lock offline Exchange to a local-only escrow ledger over versioned offline profiles. It may
  reuse the state machine and UI, but it can never sync, import, export, list, settle, or move
  money/items across the online economy boundary.

### Starter Prompt

~~~text
This is Phase 26 of Cryptic Realm Recovery and Modernization: Lock Exchange Economy, Visitor, and Authority Policy.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Define the complete Exchange Realm authority model before schema or UI work.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 25 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-26-exchange-policy.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- existing money/market implementation
- Exchange realm definition/env
- server realm admission
- trade/market rules
- PostgreSQL official transaction docs
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Lock denomination to the existing integer copper-equivalent money unit, no floating point or FX; reserve buyer funds server-side and enforce conservation: reservation equals seller proceeds plus successful-settlement fee plus refund remainder.
- Lock item custody/provenance/compatibility/idempotency and projected inventory as a non-owning view of source escrow, never a copied character inventory.

Integration/evidence agent:
- Define time-bound authenticated online visitor/delivery leases and mechanically disable
  every non-Exchange gameplay command for visitors.
- Define the offline local-only escrow/profile authority, identical state transitions where
  practical, and decisive no-sync/import/export/online-settlement boundaries.

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
- policy tests for every allowed/denied command
- money conservation property tests
- visitor lease state-machine tests
- projected-inventory ownership negative tests
- offline local-ledger persistence and offline/online boundary tests

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/architecture-reviewer.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(exchange): lock economy authority
- feat(exchange): define visitor leases
- test(exchange): enforce disabled gameplay

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Currency denomination/reservation/proceeds/refunds/fees and money-supply invariant are explicit.
- [ ] Projected inventory never owns/copies the item, and every registered source/destination realm has an explicit allow/deny compatibility result.
- [ ] Visitor/delivery leases recover and expire safely.
- [ ] Combat/quest/mail/progression/local-market paths are mechanically disabled, and offline
  Exchange state is versioned/local-only with no path into online money, items, or listings.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 26 QA handoff.

STOPPING RULES:
- Do not implement schema before the conservation and lease invariants have decisive tests.
- Do not introduce exchange rates or realm-local denominations.
- Do not make offline Exchange syncable or convertible into online economy state.
~~~
