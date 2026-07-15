# Phase 42: Audit Housing Lineage, Security, and External Surfaces

## Purpose

Classify every housing commit/asset/API and approve only behavior with current security, privacy, custody, license, and product evidence.

## Deliverables

- Build exact housing lineage from `housing-live` at `505142a51f32550f0c6c0d917c4f22e61b51efe9` and all reachable housing commits/assets, with recover/redesign/upstream/quarantine/reject disposition for every vertical slice and asset.
- Research current official wallet/chain/SDK signature, network, finality, custody, privacy, and licensing behavior; mark unverifiable items OPEN/quarantined.
- Define safe ownership, access, visit, moderation, deletion, economy firewall, rollback, and no-client-key boundaries.
- Add permanent manifest contracts and negative tests for rejected wallet/financial/secret/unlicensed paths.

### Starter Prompt

~~~text
This is Phase 42 of Cryptic Realm Recovery and Modernization: Audit Housing Lineage, Security, and External Surfaces.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Classify every housing commit/asset/API and approve only behavior with current security, privacy, custody, license, and product evidence.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 41 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-42-housing-audit.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- exact `housing-live` ref at `505142a51f32550f0c6c0d917c4f22e61b51efe9`, every reachable housing commit, and every referenced asset; compare other housing refs by patch ID rather than branch name
- wallet/chain code
- official external docs
- permanent recovery manifest
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Build exact housing lineage rooted at `housing-live` `505142a51f32550f0c6c0d917c4f22e61b51efe9`; patch-ID compare every other housing ref and assign recover/redesign/upstream/quarantine/reject disposition, owner, and evidence to every vertical slice and asset.
- Research current official wallet/chain/SDK signature, network, finality, custody, privacy, and licensing behavior; mark unverifiable items OPEN/quarantined.

Integration/evidence agent:
- Define safe ownership, access, visit, moderation, deletion, economy firewall, rollback, and no-client-key boundaries.
- Add permanent manifest contracts and negative tests for rejected wallet/financial/secret/unlicensed paths.

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
- housing lineage checker
- exact-ref assertion for `housing-live` `505142a51f32550f0c6c0d917c4f22e61b51efe9` plus missing/unclassified reachable commit and asset fixtures
- external contract fixtures
- secret/license scans
- rejected-path negative tests

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- docs(housing): classify recovery slices
- test(housing): reject unsafe boundaries

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every commit/slice/asset reachable from exact `housing-live` `505142a51f32550f0c6c0d917c4f22e61b51efe9` has evidence-backed disposition and owner.
- [ ] Unverifiable financial/wallet behavior stays disabled/quarantined.
- [ ] Ownership/privacy/moderation/deletion boundaries are explicit.
- [ ] No private key/custody secret can enter client or Git.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 42 QA handoff.

STOPPING RULES:
- Do not touch real funds/tokens/wallets.
- Do not recover a branch wholesale.
- Do not accept a housing lineage that omits or silently moves the pinned `housing-live` ref.
~~~
