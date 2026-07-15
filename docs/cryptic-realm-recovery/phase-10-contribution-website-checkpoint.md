# Phase 10: Complete Shared Delivery Status, Contribution Website, and Foundation Checkpoint

## Purpose

Prove the shared public/operator delivery-status projections, render accurate contribution
state on CrypticRealm.com, and prepare the first automatic QA-gated release checkpoint for
the recovered foundation.

## Deliverables

- Implement separate allowlisted public and authenticated operator status projections from
  the Phase 09 ledger, including timestamps, staleness, redacted failures, and visibility policy.
- Replace the static contribution list with an accessible server-fed view of the public
  projection, filters, timestamps, links, and a dated static fallback.
- Add localization, mobile, cache/outage, stale-data, authorization, consent-bound visibility,
  and no-secret tests plus current PR reconciliation screenshots. Bug reports stay private by
  default; Phase 45 owns their submission, sanitization, consent, attachments, and issue filing.
- Prepare a foundation checkpoint candidate with only completed upstream/control-plane/contribution flags enabled and all incomplete gameplay systems disabled.

### Starter Prompt

~~~text
This is Phase 10 of Cryptic Realm Recovery and Modernization: Complete Shared Delivery Status, Contribution Website, and Foundation Checkpoint.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Prove shared public/operator delivery status, render accurate contribution state on CrypticRealm.com, and prepare an immutable foundation candidate for separate QA.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 09 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-10-contribution-website-checkpoint.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- public/contributions.html
- Phase 09 shared outbound-delivery ledger and projection contracts
- server contribution and operator status endpoints
- src/ui/i18n.ts if shared shell text changes
- promotion control plane
- tmp/qa-loop artifacts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Implement distinct allowlisted public and authenticated operator status projections from
  the Phase 09 ledger, including timestamps, staleness, redacted failures, authorization,
  and per-record visibility policy.
- Prove any future bug-report-class record is excluded from public status by default and can
  expose only an explicitly consented, sanitizer-approved summary. Do not implement report
  submission, report sanitization, attachments, or GitHub issue filing in this phase.

Integration/evidence agent:
- Replace the static contribution list with an accessible server-fed public projection,
  filters, timestamps, links, dated fallback, localization, mobile behavior, and current PR
  reconciliation screenshots.
- Prepare an immutable foundation checkpoint candidate and evidence with only completed
  upstream, control-plane, contribution, and shared-delivery flags enabled. Separate QA alone
  may issue PASS, invoke promotion, verify every target realm, or roll back.

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
- Bug-report submission, sanitization, consent capture, attachments, abuse policy, GitHub issue
  filing, or feature-specific reconciliation; Phase 45 implements those on the shared foundation.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/delivery_status_projection.test.ts tests/contribution_website.test.ts tests/github_contributors.test.ts tests/localization_fixes.test.ts
- public/operator authorization, allowlist, private-default, explicit-consent, and sanitizer-approval fixtures
- npm run gate
- npm run security:gate
- desktop/mobile screenshots and console-error check
- foundation stage smoke

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(delivery): expose safe status projections
- feat(web): show live contribution state
- test(web): cover contribution fallback
- chore(release): prepare foundation checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Public and authenticated operator views derive from the same Phase 09 record but expose
  only their explicit allowlists.
- [ ] Website state matches reconciled GitHub state and survives outage/rate limiting.
- [ ] No secret/private payload or metadata reaches browser, logs, fallback, or screenshots;
  bug-report-class records remain private unless consent and sanitizer approval are both present.
- [ ] Incomplete gameplay flags remain disabled and no discovered stable upstream release remains pending from the Phase 05 through 07 cycle.
- [ ] Dedicated QA binds PASS to the immutable candidate before automatic promotion; deployment
  verifies every target realm or rolls back.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 10 QA handoff.

STOPPING RULES:
- Do not mutate production from the implementation session.
- Do not promote with a non-clean REPORT or any enabled incomplete system.
- Do not make operator status publicly reachable or expose raw delivery payloads in either projection.
- Do not implement Phase 45 bug-report behavior in this phase.
~~~
