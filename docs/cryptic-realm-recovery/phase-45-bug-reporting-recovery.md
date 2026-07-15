# Phase 45: Harden Bug Reporting Security and Parity

## Purpose

Harden bug-report security and parity on the shared bug-report delivery foundation established in Phases 09 and 10 (outbound delivery, state, retry, dead-letter, reconciliation, and status); recover only live behavior still missing from that foundation.

## Deliverables

- Produce a parity matrix from live commit `2ca141929` to the Phase 09/10 shared delivery/state/retry/dead-letter/reconciliation/status contracts, patch-ID classify every delta, and stop if the shared foundation is absent rather than creating a second pipeline.
- Add only bug-report-specific authenticated/rate-limited submission, dedupe keys, consent/privacy, attachment policy, sanitized issue adapter, and operator reconciliation hooks on the shared foundation.
- Harden sanitization for account/character identifiers, chat, URLs, logs, environment metadata, attachments, and GitHub credential boundaries across browser, server, queue, operator, and public-issue views.
- Add parity, API/DB/shared-queue/GitHub outage/replay/rate-limit/privacy/abuse tests and permanent F-024 coverage proving no duplicate delivery implementation exists.

### Starter Prompt

~~~text
This is Phase 45 of Cryptic Realm Recovery and Modernization: Harden Bug Reporting Security and Parity.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Harden bug-report security and parity by adapting the Phase 09/10 shared delivery foundation, not by reimplementing delivery, retry, dead-letter, reconciliation, or public status.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 44 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-45-bug-reporting-recovery.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- live commit 2ca141929
- Phase 09 shared outbound-delivery state machine, persistence, idempotency, retry/backoff, dead-letter, signed reconciliation, and operator contracts
- Phase 10 server-fed status/website endpoint, cache/fallback, privacy, and checkpoint contracts
- server GitHub integration and shared delivery adapters
- server DB/http shared delivery schemas and routes
- public/client report UI
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Patch-ID compare live commit `2ca141929` to the Phase 09/10 shared delivery foundation and produce a parity matrix for submit, persistence, sanitized payload, consent/privacy, attachment, status, idempotency, retry, dead-letter, reconciliation, and public/operator visibility. If the shared foundation is missing, STOP and return the defect to Phase 09/10.
- Add only bug-report-specific authenticated/rate-limited submission, dedupe key, privacy/consent, attachment, sanitized GitHub issue adapter, and operator reconciliation behavior through the shared state machine and persistence APIs.

Integration/evidence agent:
- Harden account/character, chat, URL, log, environment, attachment, and credential sanitization at every shared delivery boundary; reuse Phase 10 status rendering without exposing private payloads or GitHub credentials.
- Add parity, API/DB/shared-queue/GitHub outage/replay/rate-limit/privacy/abuse tests, a duplicate-delivery-implementation guard, and permanent F-024 coverage.

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
- A new generic delivery queue, retry/dead-letter state machine, reconciliation service, or public status pipeline; those are Phase 09/10 foundations and must be fixed there if absent.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- focused bug-report parity/API/DB/shared-delivery adapter tests
- shared queue GitHub outage/rate-limit/replay/dead-letter/reconciliation fixtures
- privacy/metadata sanitizer tests
- duplicate generic delivery/schema/route implementation guard
- npm run build:server

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
- feat(reports): recover safe bug filing
- test(reports): cover privacy and retry

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every `2ca141929` behavior is recovered, superseded, rejected, or dead-lettered against the Phase 09/10 foundation with evidence.
- [ ] Reports persist and file idempotently through the shared foundation without secrets/private data or duplicate queue/state/schema logic.
- [ ] Shared retries/dead-letter/reconciliation/status remain observable and parity-correct.
- [ ] Rate limits/auth/consent protect abuse/privacy.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 45 QA handoff.

STOPPING RULES:
- Do not auto-file raw logs/chat/account data.
- Do not grant arbitrary GitHub issue permissions.
- Do not create a second delivery queue, state machine, retry/dead-letter service, reconciliation path, or public status ledger.
- If a required shared Phase 09/10 contract is missing, stop and repair that foundation before continuing Phase 45.
~~~
