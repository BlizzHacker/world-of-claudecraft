# Phase 02: Create Permanent Recovery Guards and Runbook

## Purpose

Move an exhaustive, deterministic lineage ledger, environment identity, semantic feature contracts, tests, and operating instructions into permanent repository artifacts that survive planning-packet teardown.

## Deliverables

- Create config/cryptic-recovery/features.json with an exhaustive, byte-stably sorted ledger of every local ref namespace, currently advertised remote ref, and preserved-bundle ref, including captured production HEAD `46be1494c58bf25ed6ac6c89884a80d5f5fbf639` from the verified recovery bundle/release, `upstream/feature/gauntlet-event` at `196487c8688825d6831278191d3160e622142ec5`, `housing-live` at `505142a51f32550f0c6c0d917c4f22e61b51efe9`, and live fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1`; include immutable production/legacy environment profiles and a read-only inventory of related LXCs that either pins one safe isolated stage or records `ephemeral_required`.
- Deterministically enumerate every Cryptic-unique or offline-only commit, compute stable per-parent patch IDs against the upstream ref universe, retain merge topology, and require each commit/source row to be `recovered`, `superseded`, `rejected`, or `dead-letter` with owner and evidence; fail on any missing or unclassified row.
- Enumerate current registries, IWorld/API surfaces, SimEvents/wire fields/commands, REST/admin routes, inline DDL and persisted-state schemas, i18n/matchers, assets/config/jobs, and decisive tests; require every surface row to use the same recovered/superseded/rejected/dead-letter taxonomy with owner/evidence, and create scripts/admin/check_recovery_manifest.mjs plus tests/recovery_manifest.test.ts that reject semantic omissions, ref drift, environment mismatch, and non-exhaustive discovery.
- Create docs/operations/cryptic-recovery-runbook.md covering identity reconciliation, source-ledger refresh, patch-ID dedupe, AI-evidence classification, quarantine integration, QA artifacts, private Git/DB/runtime-config backup and restore, isolated stage selection or exact-artifact ephemeral provisioning/teardown, checkpoint promotion, rollback, and incident recovery without deleting history.

### Starter Prompt

~~~text
This is Phase 02 of Cryptic Realm Recovery and Modernization: Create Permanent Recovery Guards and Runbook.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Move lineage, environment identity, semantic feature contracts, tests, and operating instructions into permanent repository artifacts that survive planning-packet teardown.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 01 QA is complete.
- Read progress.md and state.md first and preserve all completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-02-permanent-recovery-manifest.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- feature-inventory.md
- Phase 01 evidence
- every local ref namespace from unfiltered `git for-each-ref`, including heads, remote-tracking
  refs, tags, stash, replace refs, notes, pull refs, and Codex/session captures; every currently
  advertised remote ref from `git ls-remote`; and every preserved recovery-bundle ref from
  `git bundle list-heads`
- captured production HEAD `46be1494c58bf25ed6ac6c89884a80d5f5fbf639` from the verified
  recovery bundle/release; current local or remote refs with the former branch name are drift
  evidence and must not be relabeled as the captured source
- `upstream/feature/gauntlet-event` at `196487c8688825d6831278191d3160e622142ec5`
- `housing-live` at `505142a51f32550f0c6c0d917c4f22e61b51efe9`
- live duplicate-realm-entry fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1`
- all current realm/content/minigame/item/mount/talent registries, IWorld/API members, SimEvents, wire fields, WS commands, REST/admin routes, inline DDL, persisted JSONB/browser schemas, i18n/matchers, assets/config/jobs, and their tests
- LXC 180 hermes-server read-only inventory
- read-only Proxmox inventory of every related LXC and service identity that could be a stage;
  never classify one safe without storage/network/credential/side-effect isolation evidence
- existing scripts/admin and tests patterns
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact current behavior, source refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and plan drift. Do not trust stale line numbers. For external APIs/SDKs/formulas/licenses, spawn a separate web-research subagent using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this vertical split explicitly. Give each agent only the Explore summary and owned files. Agents write tests for their changes.

Domain/authority agent:
- Create config/cryptic-recovery/features.json by deterministically walking and sorting every
  namespace returned by unfiltered `git for-each-ref`, every remote-advertised ref, and every
  preserved-bundle ref. Record the four pinned sources above exactly, and treat moved/deleted
  branch names as drift rather than rewriting or relabeling captured evidence. Record immutable
  production/legacy identities and classify every related LXC read-only; pin a safe isolated
  stage only with evidence, otherwise set `ephemeral_required`.
- For every commit reachable only from Cryptic/local/offline sources relative to the upstream ref universe, record full SHA, parents, source refs, stable patch ID per parent or an explicit empty/merge marker, upstream-equivalent SHA when present, and one required disposition (`recovered`, `superseded`, `rejected`, `dead-letter`) with owner and evidence. Create checker/tests that fail any undiscovered, duplicated-without-equivalence, ownerless, evidence-free, or unclassified entry.

Integration/evidence agent:
- Inventory every current registry/API/schema/route surface listed in Step 1, bind each entry to source and exactly one recovered/superseded/rejected/dead-letter disposition with owner and decisive test evidence, and make semantic omission or any unclassified entry a hard checker failure.
- Create the operations runbook for deterministic ledger refresh, patch-ID equivalence review, identity reconciliation, quarantine, QA artifacts, private Git/DB/runtime-config backup and restore, isolated stage selection or exact-artifact ephemeral provisioning/teardown, promotion, rollback, incident recovery, and evidence-only AI provenance including LXC 180 and unverifiable DeepSeek claims.

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
- node scripts/admin/check_recovery_manifest.mjs
- npx vitest run tests/recovery_manifest.test.ts
- run generator/check twice and compare byte-identical results
- compare unfiltered `for-each-ref`, `ls-remote`, and `bundle list-heads` discovery
  counts/identities to the emitted ledger, including tags/stash/replace/notes/pull/Codex refs
- run deliberate missing-ref, moved-captured-ref, unmatched patch-ID, unclassified commit, missing registry/API/schema/route, ownerless evidence, wrong-environment, wrong-first-parent, and stale-release fixtures
- run unsafe-related-LXC, missing-stage-identity, and `ephemeral_required` fallback fixtures

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
- feat(ops): add cryptic recovery manifest
- test(ops): enforce recovery contracts
- docs(ops): add recovery runbook

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] The permanent manifest, checker, tests, and operations runbook exist outside docs/cryptic-realm-recovery.
- [ ] Every namespace from unfiltered local `for-each-ref`, every remote-advertised and
  preserved-bundle ref, plus every Cryptic-unique/offline commit is present, patch-ID compared
  to upstream, and classified as recovered, superseded, rejected, or dead-letter with owner
  and evidence.
- [ ] Every current registry/API/schema/route contract is enumerated and a deliberate omission fails.
- [ ] Environment mismatch and semantic omission prevent candidate creation or promotion.
- [ ] Every related LXC has a read-only disposition; a stage is pinned only with decisive
  isolation evidence, otherwise Phase 04 receives `ephemeral_required`.
- [ ] Packet teardown cannot remove the permanent guards or source ledger.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress.md and state.md with UTC timestamps, exact SHAs, identifiers, tests, reviewer verdicts, evidence, risks, and next action.
- Update feature-inventory.md and permanent manifest/runbook contracts when applicable.
- Append LEDGER. REPORT scenarios use id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files, commits, focused validation, reviewers, LEDGER/REPORT changes, deferrals, feature-flag state, and one-line handoff to Phase 02 QA.

STOPPING RULES:
- Do not store host secrets, account IDs, tokens, private URLs, or recovery-key material in the manifest.
- Do not infer AI authorship without commit, trailer, branch, or artifact evidence.
- Stop rather than accepting a partial ref scan, an unclassified commit/surface, or an equivalence claim without patch-ID evidence.
~~~
