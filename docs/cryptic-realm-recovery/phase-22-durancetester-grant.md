# Phase 22: Prepare Auditable DuranceTester Grant Operation

## Purpose

Bind protected runtime inputs to the already-promoted, fixture-tested entitlement operator for a
later independent QA session. That QA alone may resolve the runtime owner, lock an exact
row/realm allowlist, issue PASS, and grant all three mounts to the intended scope.

## Deliverables

- Confirm Phase 21 QA promoted and verified the exact code/schema build containing normalization,
  runtime-owner authentication, row/realm allowlisting, cardinality, idempotency, audit, and
  revoke behavior; rerun only its existing dry-run fixtures.
- Prepare a protected runtime-input manifest and runbook that binds the existing operator to
  exact normalized name `durancetester`, owner authentication, explicit row/realm allowlist,
  all-three-mount zero-cost bundle, idempotency key, audit/readback, and revoke command.
- Record that Phase 22 adds no executable entitlement code: any code/schema/operator change
  returns through Phase 17 implementation and Phase 21 QA/promotion before use.
- Prepare the QA runbook for read-only live cardinality preflight, explicit scope lock,
  pre-operation PASS, one production action, exact-row audit/readback, and stop/revoke on
  mismatch. Implementation performs no live read or mutation.

### Starter Prompt

~~~text
This is Phase 22 of Cryptic Realm Recovery and Modernization: Prepare Auditable DuranceTester Grant Operation.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Prepare target-neutral, fixture-tested operator tooling and an exact handoff. Independent
Phase 22 QA alone may resolve the live owner/rows, lock scope, issue PASS, and operate.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 21 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-22-durancetester-grant.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- generic entitlement operator
- Phase 21 production verification
- local/restored fixtures
- secret-safe runtime operator channel
- tmp/qa-loop artifacts
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Confirm Phase 21 QA promoted and verified the exact code/schema build, then rerun dry-run against local and sanitized restored fixtures.
- Verify the already-promoted command has exact normalized name `durancetester`, authenticated
  runtime owner input, explicit realm/row allowlisting, and fail-closed zero/one/many behavior
  through existing local and sanitized fixtures. Do not modify executable code.

Integration/evidence agent:
- Prepare protected runtime inputs for the already-promoted idempotency-keyed all-three-mount
  action with audit/readback and revoke; any executable change returns through Phase 21.
- Prepare the QA runbook for read-only live cardinality preflight, explicit scope lock,
  pre-operation PASS, one production action, exact-row audit/readback, and stop/revoke on
  mismatch. Do not run it in implementation.

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
- focused entitlement/operator tests
- local and restored-fixture dry runs
- secret/target-data diff and log scan
- fixture-only cardinality and allowlist preflight; no live target lookup

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
- test(ops): verify mount grant workflow
- docs(ops): record target neutral grant procedure

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Reviewed code/schema is already promoted and Phase 22 adds no executable operator,
  schema, or entitlement behavior.
- [ ] No target IDs/account values are committed or logged.
- [ ] The operator fails closed on zero or multiple matches unless independent QA supplies an
  explicit runtime realm/row allowlist whose cardinality exactly matches read-only preflight.
- [ ] The handoff gives QA one idempotent action for Forest Stag, Swamp Raptor, and Emerald
  Wyrm at zero cost, plus exact-row audit/readback and safe revoke, without executing it.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 22 QA handoff.

STOPPING RULES:
- Do not act before dedicated QA PASS or Phase 21 production health.
- Stop if account scope/name normalization matches any unintended row.
- Do not resolve live owner/account/character data during implementation.
- Do not add executable grant code after Phase 21 promotion; return any such change to Phase 17
  and Phase 21.
~~~
