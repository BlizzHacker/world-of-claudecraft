# Phase 03: Automate Recurring Upstream Release Intake

## Purpose

Discover the latest stable ClaudeCraft release on a schedule, quarantine it, evaluate semantic drift, and open an internal integration PR without touching live branches.

## Deliverables

- Implement latest-stable release discovery with v0.26.0 pinned as the recovery baseline, a daily 06:00 UTC schedule plus manual trigger, and a fresh stable-release recheck on every run. Enforce one active run, a two-hour timeout, stale-lock recovery, and bounded exponential retries.
- Create a detached quarantine worktree and candidate ref, run the permanent manifest plus overlap/semantic audits, and write a machine-readable intake report.
- Lock merge topology: parent one is the prepared compatibility-line tip descended from the manifest-pinned Cryptic anchor, parent two is the exact current-cycle upstream stable release, and private overlays stay behind named seams.
- Open or update one internal PR with candidate state, retries, timestamps, and no automatic live merge/push. Produce an owner-visible alert and dead-letter record within 24 hours of terminal failure, and record the stable recovery base separately from the public PR target prescribed by the current upstream `CONTRIBUTING.md`.

### Starter Prompt

~~~text
This is Phase 03 of Cryptic Realm Recovery and Modernization: Automate Recurring Upstream Release Intake.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Discover the latest stable ClaudeCraft release on a schedule, quarantine it, evaluate semantic drift, and open an internal integration PR without touching live branches.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 02 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-03-recurring-upstream-intake.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- scripts/admin/sync-upstream.sh
- deploy/systemd/cryptic-realm-upstream-sync.*
- permanent recovery manifest/runbook
- upstream release refs
- the current upstream `CONTRIBUTING.md` and its prescribed public PR target
- woc-release-merge-audit skill
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Implement latest-stable release discovery with v0.26.0 pinned as the recovery baseline and a fresh recheck on a daily 06:00 UTC schedule plus manual trigger. Enforce a single-flight lock, a hard two-hour timeout, stale-lock recovery, and bounded exponential retries with persisted attempt state.
- Create a detached quarantine worktree and candidate ref, run the permanent manifest plus overlap/semantic audits, and write a machine-readable intake report.

Integration/evidence agent:
- Lock merge topology: use the prepared compatibility-line tip descended from the manifest-pinned Cryptic anchor as parent one and the exact current-cycle upstream stable release as parent two; keep private overlays behind named seams.
- Open or update one internal PR with candidate state, retries, and timestamps. On terminal failure, create a dead-letter record and owner-visible alert within 24 hours. Resolve and record the upstream `CONTRIBUTING.md`-prescribed public PR target independently; never assume the stable release recovery base is that contribution target.

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
- npx vitest run tests/upstream_intake.test.ts tests/recovery_manifest.test.ts
- simulate scheduled and manual triggers, concurrent triggers, two-hour timeout, stale lock, bounded exponential retry, no-new-release, new-stable-release, prerelease, fetch failure, conflict, semantic omission, alert, and dead-letter timing
- verify candidate parent one is the prepared compatibility-line tip descended from the manifest-pinned Cryptic anchor and parent two is the exact current-cycle stable release
- verify the stable recovery base and current upstream `CONTRIBUTING.md`-prescribed public PR target are stored and validated as distinct concepts

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
- feat(upstream): discover stable releases
- feat(upstream): quarantine semantic intake
- test(upstream): enforce compatibility-line merge topology

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] v0.26.0 remains the reproducible baseline while every execution rechecks latest stable and queues each newer stable release in ascending order for the Phase 05 through 07 integration cycle.
- [ ] Intake runs daily at 06:00 UTC and on manual trigger with single-flight exclusion, a hard two-hour timeout, stale-lock recovery, and bounded exponential retries.
- [ ] No prerelease or upstream main ref is selected as stable.
- [ ] Every candidate lives in quarantine and reaches an internal PR or an explicit dead-letter plus owner-visible alert within 24 hours of terminal failure.
- [ ] Parent one is the prepared compatibility-line tip descended from the manifest-pinned Cryptic anchor, parent two is the exact current-cycle stable release, and the overlay-seam policy is machine-enforced.
- [ ] The stable release recovery base and the public PR target prescribed by the current upstream `CONTRIBUTING.md` are discovered, recorded, and validated independently.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 03 QA.

STOPPING RULES:
- Do not change the pinned recovery baseline silently when a newer release appears.
- Do not push or merge a candidate directly to live, alpha, beta, or production refs.
- Do not treat the selected stable release as the public contribution target unless the current upstream `CONTRIBUTING.md` explicitly prescribes it.
~~~
