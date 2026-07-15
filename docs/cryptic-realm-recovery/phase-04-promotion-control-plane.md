# Phase 04: Build QA-Gated Promotion and Rollback Control Plane

## Purpose

Build the reusable checkpoint state machine that can promote only after a dedicated QA PASS, verified recoverability, and isolated stage compatibility, then verify or automatically roll back.

## Deliverables

- Implement immutable states for candidate, gated, backed-up, restored, staged, soaked, QA_PASS, promoting, verified, rolled_back, and failed, with locks and timestamps.
- Before every promotion, require environment-profile reconciliation, npm run gate, npm run security:gate, malware-audit verdict, a clean REPORT, an immutable private Git ref or verified private bundle publication, a verified rollback ref, DB and runtime-config backup/restore evidence, retention checks, and schema/wire canary evidence.
- Use only a manifest-pinned existing related-LXC stage whose identity is verified. If none exists, provision an isolated ephemeral stage from the exact candidate artifact with sanitized QA-only data, no production credentials, webhooks, or PR side effects, dev cheats OFF, and recorded exact identity. Verify cleanup/reset before retaining an existing stage and teardown before closing an ephemeral stage. Any stage identity, isolation, smoke, cleanup, or teardown failure halts promotion.
- Promote only after the QA session records pre-promotion PASS, then verify HEAD/build/realm/API/smokes and automatically roll back on any post-deploy failure. Keep incomplete systems behind server-controlled default-off flags and enable only the coherent slice approved by checkpoint QA.

### Starter Prompt

~~~text
This is Phase 04 of Cryptic Realm Recovery and Modernization: Build QA-Gated Promotion and Rollback Control Plane.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Goal: Build the reusable checkpoint state machine that can promote only after a dedicated QA PASS, verified recoverability, and isolated stage compatibility, then verify or automatically roll back.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 03 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-04-promotion-control-plane.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- deploy/systemd promotion/stage units
- scripts/admin deployment scripts
- scripts/gate.mjs
- scripts/malware_scan.mjs
- tmp/qa-loop artifacts
- permanent recovery runbook
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Implement immutable states for candidate, gated, backed-up, restored, staged, soaked, QA_PASS, promoting, verified, rolled_back, and failed, with locks and timestamps.
- Require environment-profile reconciliation, npm run gate, npm run security:gate, malware-audit verdict, a clean REPORT, an immutable private Git ref or verified private bundle publication, a verified rollback ref, DB and runtime-config backup/restore evidence, retention checks, schema/wire canary evidence, and safe stage evidence before QA_PASS is issuable.

Integration/evidence agent:
- Resolve only a manifest-pinned existing related-LXC stage with verified identity. If none exists, provision an isolated ephemeral stage from the exact candidate artifact using sanitized QA-only data, separate storage/network identity, no production credentials, deploy keys, webhooks, mail, or PR side effects, and dev cheats OFF. Record exact stage and artifact identity, clean/reset an existing stage, tear down an ephemeral stage, and halt on any provisioning, identity, isolation, smoke, cleanup, or teardown failure.
- Promote only after the QA session records pre-promotion PASS, then verify HEAD/build/realm/API/smokes and automatically roll back on any post-deploy failure.
- Keep incomplete systems disabled by server-controlled default-off feature flags; enable only the coherent slice approved by its checkpoint QA.

INVARIANTS:
- Deterministic DOM-free 20 Hz sim; Rng only; no Math.random, Date.now, or performance.now in src/sim.
- IWorld first; implement Sim and ClientWorld plus headless where relevant.
- Server authority for identity, movement, combat, loot, rewards, economy, custody, and entitlements.
- Additive/idempotent/indexed DDL; old saves load; forward data survives application rollback.
- Versioned wire/schema canary compatibility.
- English i18n key first, then every locale and matcher.
- Controller/touch/mobile/accessibility are first-class.
- No secrets, personal data, target IDs, unlicensed content, or production dev commands.
- Stage may receive only sanitized QA data and stage-scoped credentials; production databases, credentials, deploy keys, webhook/mail endpoints, PR tokens, and other external side effects are prohibited.
- Test new code; remove proven dead replacements; regenerate generated files.
- Explicit staging only; never git add -A.
- Append a UTC entry to tmp/qa-loop/LEDGER.md. Update REPORT scenario evidence when behavior is exercised.

OUT OF SCOPE:
- Production mutation or feature activation from this implementation session.
- Later-phase systems, unrelated cleanup, destructive history/schema/data changes.
- Product decisions outside state.md and this prompt.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/promotion_pipeline.test.ts tests/promotion_rollback.test.ts tests/environment_identity.test.ts tests/stage_environment.test.ts
- systemd-analyze verify on changed units
- isolated local/stage failure injection at every state, including schema/wire canary and
  partial-realm failure; production is observation-only except for automatic rollback
- exercise both the manifest-pinned related-LXC stage path and the no-stage ephemeral fallback; prove exact-artifact identity, sanitized QA-only data, blocked external side effects, dev cheats OFF, cleanup/teardown, and promotion halt on every stage failure
- verify the immutable private Git ref or private bundle publication, DB/runtime-config backup restore drills, rollback ref, and retention evidence before issuing QA_PASS
- npm run gate
- npm run security:gate

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/migration-safety.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- If the actual diff adds another matching surface, dispatch its matching .claude/agents prompt too.
- Request COVERAGE, including low-severity and uncertain findings. Require BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
Use explicit paths and these Conventional Commit targets:
- feat(deploy): gate checkpoint promotion
- feat(deploy): add canary rollback state
- test(deploy): prove prepass and rollback ordering

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] No production mutation occurs before an explicit dedicated-QA pre-promotion PASS token bound to one commit/report/checksum.
- [ ] A red precondition produces zero production mutation.
- [ ] Every promotion has an immutable private Git ref or verified private bundle publication, a verified rollback ref, successful DB and runtime-config backup/restore evidence, and passing retention checks before QA_PASS.
- [ ] Stage uses a manifest-pinned verified related-LXC environment when available; otherwise it uses an exact-artifact isolated ephemeral environment with sanitized QA-only data, no production credentials or external side effects, dev cheats OFF, and recorded identity. A retained existing stage is cleaned/reset, and an ephemeral stage is torn down, before the stage gate closes.
- [ ] Any stage provisioning, identity, isolation, smoke, cleanup, or teardown failure halts before production mutation.
- [ ] A red post-deploy check on any realm rolls the entire checkpoint ring back to the verified compatible ref and proves recovered health; mixed-version production is rejected.
- [ ] Feature flags prevent partial systems from becoming reachable.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 04 QA.

STOPPING RULES:
- Do not use destructive down-migrations during rollback.
- Stop before production mutation if immutable private source recovery, DB/runtime-config restore evidence, retention, exact stage identity, stage isolation, stage smoke, cleanup, or teardown is missing or red.
~~~
