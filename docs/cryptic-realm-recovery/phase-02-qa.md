# Phase 02 QA: Verify Create Permanent Recovery Guards and Runbook

### QA Starter Prompt

~~~text
This is Phase 02 QA of Cryptic Realm Recovery and Modernization: Verify Create Permanent Recovery Guards and Runbook.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use bounded generic-agent waves with adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Independently verify every Phase 02 deliverable and acceptance item before it can be called complete.

STEP 0 - PRE-FLIGHT:
- Verify implementation is committed. Record phase-start/end SHAs and UTC timestamp.
- Inspect git status and preserve unrelated work.
- Read current progress/state and existing LEDGER/REPORT. Never erase prior evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to summarize state.md, progress.md, feature-inventory.md, qa-checklist.md, phase-02-permanent-recovery-manifest.md, full Phase 02 diff, permanent manifest/runbook if present, root AGENTS.md/CLAUDE.md, and governing area CLAUDE.md files.
Return every promised deliverable/acceptance item, changed file, new IWorld/event/wire/endpoint/DDL/i18n/asset/config, feature flag, test, known issue, environment profile, and evidence gap.

STEP 2 - QA AUDIT:
Spawn parallel fresh agents using only the Explore summary.

Correctness agent:
- Delete a required feature contract in a fixture and prove the checker fails decisively.
- Independently enumerate unfiltered local refs (including tags, stash, replace, notes, pull,
  and Codex/session namespaces), currently advertised remote refs, and preserved-bundle refs;
  compare sorted identities/counts to the ledger. Require captured production HEAD
  `46be1494c58bf25ed6ac6c89884a80d5f5fbf639` from verified recovery evidence without
  mislabeling a moved branch, `upstream/feature/gauntlet-event` at
  `196487c8688825d6831278191d3160e622142ec5`, `housing-live` at
  `505142a51f32550f0c6c0d917c4f22e61b51efe9`, and live fix
  `6564b2bca90d5b0979994e6e76e27743a3aab2c1`.
- Recompute stable per-parent patch IDs for every Cryptic-unique/offline commit against the upstream ref universe and verify full SHA, parents, source refs, equivalence, disposition, owner, and evidence. Any missing row or value outside recovered/superseded/rejected/dead-letter is FAIL.
- Independently enumerate current registries, IWorld/API members, SimEvents/wire/commands, REST/admin routes, inline DDL/persisted schemas, i18n/matchers, assets/config/jobs, and tests; compare permanent artifacts to every Phase 01 source and environment profile.
- Independently enumerate every related LXC read-only and verify that a pinned stage has
  exact storage/network/credential/side-effect isolation evidence; otherwise require the
  manifest to say `ephemeral_required` and fail any guessed or identity-incomplete stage.
- Exercise empty, boundary, malformed, retry, concurrency, reconnect, version-skew, and failure states.
- Verify no production mutation preceded QA PASS.

Test coverage agent:
- Read .claude/agents/test-coverage-auditor.md completely and audit decisive assertions/negative cases.
- Map every new branch, command, endpoint, query, IWorld member, event, wire field, persisted path, UI transform, operator/deploy state, and acceptance claim to tests.
- Prove protected tests fail on deliberate regression.

Dead-code and invariants agent:
- Find duplicates, stale shims, unused imports/types/helpers, orphaned tests, comments, hand-edited generated files, private-data leaks, and forbidden sim imports/clocks/randomness.
- Remove only proven replacements and preserve user work.

Diff-gated specialists:
- Build the reviewer set from the implementation/QA diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and dispatch a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and dispatch a fresh generic read-only subagent.
- Add any reviewer newly matched by the actual diff.
- Request COVERAGE and structured BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix every BLOCKING and SHOULD-FIX item; commit QA fixes separately with explicit paths.
- Run every Phase 02 validation again:
- node scripts/admin/check_recovery_manifest.mjs
- npx vitest run tests/recovery_manifest.test.ts
- run generator/check twice and compare byte-identical results
- compare independent unfiltered `for-each-ref`, `ls-remote`, and `bundle list-heads`
  discovery, including tags/stash/replace/notes/pull/Codex refs, to the emitted ledger
- run deliberate missing-ref, moved-captured-ref, unmatched patch-ID, unclassified commit, missing registry/API/schema/route, ownerless evidence, wrong-environment, wrong-first-parent, and stale-release fixtures
- run unsafe-related-LXC, missing-stage-identity, and `ephemeral_required` fallback fixtures
- Run npm run gate at every release checkpoint, plus npm run security:gate and contextual malware audit.
- Update REPORT scenarios with id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Enforce QA naming/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Mark Phase 02 QA complete only with evidence for every criterion and a dedicated verdict.
- Append LEDGER with timestamp, candidate, environment, failures, fixes/SHAs, validations, result, next action.
- Update state/progress/inventory/permanent guards and move durable deferrals to normal tracking.
- Record memory if used.

Step 5 is intentionally absent. It is reserved for packet teardown in Phase 48 QA.

STEP 6 - FINAL RESPONSE FORMAT:
Report PASS, PASS-WITH-FOLLOWUPS, or FAIL; finding/fix counts; SHAs; validations; environment; LEDGER/REPORT state; cleanup; promotion/operation/rollback result when applicable; feature flags; deferrals; and handoff to Phase 03.

STOPPING RULES:
- Stop if a blocker requires weakening determinism, authority, privacy, migration, environment identity, or QA-before-mutation ordering.
- Stop if evidence is missing; never infer PASS.
- Do not store host secrets, account IDs, tokens, private URLs, or recovery-key material in the manifest.
- Do not infer AI authorship without commit, trailer, branch, or artifact evidence.
- Any unclassified source, commit, registry, API, schema, or route is FAIL, not a follow-up.
- Any related LXC without a disposition, or any stage without exact isolation evidence, is FAIL.
~~~
