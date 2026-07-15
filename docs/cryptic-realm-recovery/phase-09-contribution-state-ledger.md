# Phase 09: Build Shared Outbound Delivery and Contribution State Foundation

## Purpose

Establish one reusable persisted outbound-delivery foundation, then use its first adapter to
track every sanitized contribution from extraction through upstream merge or closure. Later
bug reporting must reuse this foundation instead of creating a second queue or state service.

## Deliverables

- Define and persist a reusable outbound-delivery record, adapter contract, lifecycle, source
  mapping, timestamps, attempt history, idempotency key, dispatch lease, and terminal outcome;
  map contribution states from discovered through merged, closed, or dead-letter onto it with
  additive indexed DDL, DDL-twice, old-row, save/load, interrupted-schema/crash, and
  forward-rollback coverage.
- Implement one bounded dispatcher with atomic idempotency, retry/backoff, lease recovery,
  dead-letter, and authenticated least-privilege audited/signed manual reconciliation with
  actionable redacted failure codes for every adapter.
- Implement signed webhook plus bounded polling reconciliation with pagination, rate-limit
  handling, stale-state detection, and the contribution PR lifecycle as the first adapter.
- Separate private delivery payloads and credentials from allowlisted public and operator
  status projections; reconcile existing BlizzHacker PRs without exposing private metadata.

### Starter Prompt

~~~text
This is Phase 09 of Cryptic Realm Recovery and Modernization: Build Shared Outbound Delivery and Contribution State Foundation.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Establish one persisted, reusable outbound-delivery foundation and prove it with the contribution PR lifecycle without implementing bug-report-specific behavior.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 08 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-09-contribution-state-ledger.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- server/github.ts
- server/github_contributors.ts
- server/github_db.ts
- server persistence, job, HTTP, and operator surfaces that could own a shared outbound-delivery adapter
- GitHub official webhook/API docs
- existing PR inventory
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Define and persist one reusable outbound-delivery record and adapter contract with source
  mapping, lifecycle, timestamps, attempt history, atomic idempotency key, dispatch lease,
  terminal outcome, retry/backoff, lease recovery, dead-letter, and manual reconciliation.
- Map discovered, eligible, sanitizing, gated, draft-open, review-needed, updated, merged,
  closed, retrying, and dead-letter contribution states onto that shared contract.

Integration/evidence agent:
- Implement signed webhook and bounded polling reconciliation with pagination, rate limits,
  stale-state detection, replay safety, and contribution PR lifecycle handling as the first adapter.
- Define separate allowlisted public and operator status projections, keep private payloads and
  credentials server-bound, and reconcile existing BlizzHacker PRs accurately.

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
- Bug-report submission, consent, attachments, sanitization policy, or GitHub issue filing;
  Phase 45 adds that feature-specific behavior through this adapter.
- The public contribution website and final status presentation; Phase 10 consumes the shared
  projections.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/outbound_delivery.test.ts tests/contribution_state.test.ts tests/github_server.test.ts tests/github_contributors.test.ts
- adapter-contract, atomic-idempotency, lease-expiry, bounded-retry, dead-letter, and manual-reconciliation fixtures
- webhook signature, pagination, rate-limit, outage, reorder, duplicate, and replay fixtures
- existing PR reconciliation plus public/operator projection privacy fixtures

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(delivery): add persisted outbound adapter
- feat(contrib): map upstream lifecycle
- test(delivery): cover retry reconciliation privacy

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every contribution has exactly one timestamped durable state and source mapping on the
  shared outbound-delivery contract.
- [ ] All adapters use the same atomic idempotency, bounded retry, lease recovery,
  dead-letter, and reconciliation primitives.
- [ ] Webhook/poll races and worker restarts are idempotent, and existing PR status is accurate.
- [ ] Public/operator projections contain only allowlisted status data; private payloads,
  credentials, and internal source metadata never cross a public boundary.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 09 QA handoff.

STOPPING RULES:
- Do not expose tokens, private payloads, private source metadata, or internal PR details in
  projections, logs, fixtures, screenshots, or caches.
- Do not call closed unmerged work a contribution.
- Do not create adapter-specific retry, dead-letter, or reconciliation paths.
- Do not implement bug-report-specific behavior before Phase 45.
~~~
