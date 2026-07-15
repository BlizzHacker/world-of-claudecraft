# Phase 08: Automate Sanitized Contribution Extraction

## Purpose

Continuously turn eligible private improvements into small upstream-release-based draft candidates with deterministic sanitization.

## Deliverables

- Resolve the current target repository and prescribed PR target branch, then capture a dated primary-source policy snapshot of its CONTRIBUTING file, pull-request template(s), license, DCO/CLA/signoff requirements, attribution rules, and required checks; an absent policy is recorded as evidence, never guessed.
- Trigger extraction on internal merge, feature marked upstream-candidate, manual retry, and scheduled backlog sweep; generate a minimal patch against the current upstream stable release, split mixed changes, reject private overlays/generated churn, and run upstream-compatible tests.
- Sanitize private commit/branch/path/host/account/secret/branding/lore/schema metadata while preserving every lawful author attribution, copyright/license notice, required signoff, and DCO/CLA trailer exactly as the current target policy requires; dead-letter candidates that cannot comply lawfully.
- Create or update one policy-compliant draft candidate idempotently against the prescribed target branch with source-to-public mapping and no automatic ready/merge action.

### Starter Prompt

~~~text
This is Phase 08 of Cryptic Realm Recovery and Modernization: Automate Sanitized Contribution Extraction.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Continuously turn eligible private improvements into small upstream-release-based draft candidates with deterministic sanitization.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 07 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-08-contribution-extraction.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- permanent feature manifest
- existing upstream PR refs
- the current target repository default branch and primary-source CONTRIBUTING file, pull-request template(s), LICENSE, DCO/CLA/signoff configuration or checks, attribution/copyright notices, and documented PR target branch
- GitHub official API documentation for repository contents, branches, checks, pull requests, and immutable commit references
- scripts contribution tooling
- private overlay rules
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. Spawn a separate web-research subagent to resolve the current target repository and collect dated citations from its primary-source CONTRIBUTING file, PR template(s), license, DCO/CLA/signoff checks, attribution rules, prescribed target branch, and official GitHub API docs. Mark any unavailable or contradictory requirement OPEN and block candidate creation rather than guessing.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Persist the dated target-policy snapshot and enforce the resolved repository, prescribed PR target branch, license compatibility, DCO/CLA/signoff, attribution, template, and required-check contract before extraction can leave `gated` state.
- Trigger extraction on internal merge, feature marked upstream-candidate, manual retry, and scheduled backlog sweep; generate a minimal patch against current upstream stable, split mixed changes, reject private overlays/generated churn, and run upstream-compatible tests.

Integration/evidence agent:
- Sanitize private metadata without erasing lawful attribution: preserve required author/copyright/license provenance and DCO/CLA/signoff trailers, and dead-letter any candidate whose origin, license, consent, signature, or attribution cannot satisfy the current target policy.
- Create or update one draft candidate idempotently against the prescribed target branch, apply the current template, retain source-to-public mapping and policy evidence, and never perform automatic ready/merge action.

INVARIANTS:
- Deterministic DOM-free 20 Hz sim; Rng only; no Math.random, Date.now, or performance.now in src/sim.
- IWorld first; implement Sim and ClientWorld plus headless where relevant.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, and entitlements.
- Additive/idempotent/indexed DDL; old saves load; forward data survives application rollback.
- Versioned wire/schema canary compatibility.
- English i18n key first, then every locale and matcher.
- Controller/touch/mobile/accessibility are first-class.
- No secrets, personal data, target IDs, unlicensed content, or production dev commands.
- Test new code; remove proven dead replacements; regenerate generated files.
- Explicit staging only; never git add -A.
- Append a UTC entry to tmp/qa-loop/LEDGER.md. Update REPORT scenario evidence when behavior is exercised.

OUT OF SCOPE:
- Production mutation or feature activation from this implementation session.
- Later-phase systems, unrelated cleanup, destructive history/schema/data changes.
- Product decisions outside state.md and this prompt.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/contribution_sanitizer.test.ts tests/contribution_pipeline.test.ts
- target-policy fixtures for changed CONTRIBUTING/template/license/DCO/CLA/signoff/attribution/target-branch rules
- metadata/path/secret/branding fixtures that prove lawful attribution and required signoffs survive sanitization
- duplicate and mixed-change extraction fixtures
- upstream-release worktree gate plus noncompliant-license, missing-consent, invalid-signoff, wrong-target-branch, and policy-unavailable dead-letter fixtures

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- If the actual diff adds another matching surface, dispatch its matching .claude/agents prompt too.
- Request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
Use explicit paths and these Conventional Commit targets:
- feat(contrib): extract sanitized drafts
- test(contrib): reject private metadata

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] A dated primary-source policy snapshot resolves the current target repository, prescribed target branch, CONTRIBUTING/template/license, DCO/CLA/signoff, attribution, and required-check rules.
- [ ] All four triggers produce deterministic candidate state.
- [ ] Private code and metadata are mechanically rejected.
- [ ] Lawful attribution/signoffs are preserved; every noncompliant or unverifiable candidate is dead-lettered rather than published.
- [ ] Candidates are small, release-based, test-backed, idempotent drafts against the prescribed target branch.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 08 QA.

STOPPING RULES:
- Do not publish a candidate whose inclusion cannot be explained hunk by hunk.
- Do not grant GitHub permissions beyond required draft-PR operations.
- Do not strip lawful authorship, copyright/license notices, or required signoffs in the name of sanitization.
- Do not create a candidate while the current target policy, license compatibility, CLA/DCO state, or prescribed target branch is OPEN.
~~~
