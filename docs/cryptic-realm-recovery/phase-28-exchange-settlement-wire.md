# Phase 28: Implement Exchange Settlement and Wire Protocol

## Purpose

Implement authenticated list/quote/buy/cancel/deliver/status flows and compact recovery-aware wire state.

## Deliverables

- Implement Exchange-only admission and list/browse/quote/buy/cancel/status commands using Phase 27 transactions.
- Validate ownership, compatibility, stale quote, balance, fees, source/destination realm, lease, idempotency, and concurrent buyers server-side.
- Expose projected inventory, reservations, settlement status, provenance, and delivery through
  IWorld/ClientWorld/headless with an online versioned wire adapter and a separate offline
  local-ledger adapter that emits no network traffic.
- Add replay, reconnect, retry, stale client, canary, bandwidth, realm-local bypass, and
  offline/online cross-boundary rejection tests.

### Starter Prompt

~~~text
This is Phase 28 of Cryptic Realm Recovery and Modernization: Implement Exchange Settlement and Wire Protocol.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Implement authenticated list/quote/buy/cancel/deliver/status flows and compact recovery-aware wire state.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 27 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-28-exchange-settlement-wire.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- server/game.ts
- src/world_api/market.ts
- src/net/online.ts
- headless
- Exchange DB services
- market endpoints
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Implement Exchange-only admission and list/browse/quote/buy/cancel/status commands using Phase 27 transactions.
- Validate ownership, compatibility, stale quote, balance, fees, source/destination realm, lease, idempotency, and concurrent buyers server-side.

Integration/evidence agent:
- Expose Exchange state through IWorld/ClientWorld/headless using separate online wire and
  offline local-ledger adapters; the offline adapter emits no network traffic.
- Add replay, reconnect, retry, stale client, canary, bandwidth, realm-local bypass, and
  offline/online cross-boundary rejection tests.

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
- focused exchange command/online tests
- npx vitest run tests/snapshots.test.ts tests/env_protocol.test.ts tests/bandwidth.test.ts
- npm run build:server
- npm run build:env
- realm local-market isolation tests
- offline adapter no-network/no-online-identity tests

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(exchange): add settlement commands
- feat(net): mirror exchange leases
- test(exchange): block realm bypass

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Only Exchange admission permits cross-realm commands.
- [ ] Every outcome uses persisted transaction authority.
- [ ] Projected inventory/status mirrors without ownership transfer.
- [ ] Wire/retry/reconnect cannot duplicate item or money.
- [ ] Offline commands remain local-profile-only and cannot reach online admission, wire,
  settlement, identities, listings, money, or items.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 28 QA handoff.

STOPPING RULES:
- Do not trust client price/fee/compatibility/custody fields.
- Do not expose audit/private account data in wire state.
~~~
