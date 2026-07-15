# Phase 47 QA: Verify Recover Xbox, Tauri, and Store Distribution

### QA Starter Prompt

~~~text
This is Phase 47 QA of Cryptic Realm Recovery and Modernization: Verify Recover Xbox, Tauri, and Store Distribution.

Model and harness: Codex, best available model, high/max reasoning. Opus 4.8 only when selectable. If Workflow is unavailable, use bounded generic-agent waves limited by the runtime's available worker slots, with adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Independently verify every Phase 47 deliverable and acceptance item before completion.

STEP 0 - PRE-FLIGHT:
- Verify implementation committed; record start/end SHAs and UTC timestamp; preserve unrelated work.
- Read progress/state/LEDGER/REPORT; never erase evidence.
- Confirm implementation did not mutate production.

STEP 1 - LOAD CONTEXT:
Spawn Explore to summarize state, progress, inventory, checklist, phase-47-xbox-tauri-store-recovery.md, full diff, permanent guards, root AGENTS/CLAUDE and governing CLAUDE files. Return every deliverable/criterion, changed surface, flag, test, known issue, environment, and evidence gap.

STEP 2 - QA AUDIT:
Spawn fresh parallel agents.

Correctness:
- Independently keep three verdict lanes: `web_server_candidate` (Phase 04 and current LXC only), `distribution_artifact` (signature/certificate/timestamp/hash verification only), and `store_publication` (external authorized publisher plus channel receipt/status only). Prove no lane can satisfy or mutate another.
- Inspect unsigned and, only when supplied by the authorized external signing channel, signed package contents/identity/capabilities, hashes, signature, certificate chain, timestamp, and secret boundaries. Record signer authority and verification evidence without accessing private keys.
- Run desktop controller/login/realm/co-op smoke on built artifact.
- Exercise empty, boundary, malformed, retry, concurrency, reconnect, skew, and failure states.
- Verify no production mutation preceded QA PASS.

Test coverage:
- Read .claude/agents/test-coverage-auditor.md completely.
- Map every branch/API/query/IWorld/event/wire/persistence/UI/operator/deploy state and claim to decisive positive/negative tests.
- Prove tests fail on deliberate regression.

Dead code/invariants:
- Find duplicates, stale shims, unused code/tests, generated edits, data leaks, forbidden sim imports/clocks/randomness.
- Remove only proven replacements.

Diff-gated specialists:
- Build the reviewer set from the implementation/QA diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any newly matched reviewer; request COVERAGE and structured verdict.

STEP 3 - FIX, VALIDATE, AND ISSUE VERDICT:
- Fix BLOCKING/SHOULD-FIX; commit fixes separately with explicit paths.
- Re-run:
- npx vitest run tests/tauri_store_config.test.ts tests/version_sync.test.ts tests/native_attestation.test.ts
- cargo check --manifest-path src-tauri/Cargo.toml
- npm run tauri:build:store
- npm run tauri:build:msix
- npm run xbox:build:msix
- npm run gate
- npm run security:gate
- verify manifest separation, signed-artifact hash/signature/certificate/timestamp evidence, and store receipt schema with missing/forged/cross-lane fixtures
- At checkpoints run npm run gate, npm run security:gate, and malware audit.
- Update REPORT fields exactly. Enforce QA names/rate limits, screenshots, console-error FAIL, cleanup, and no production dev commands.
PRE-PROMOTION BARRIER:
- Finish fixes/validation first. Write dedicated PASS bound to commit, artifact,
  environment, REPORT, immutable private Git backup, DB/runtime-config restore evidence,
  stage identity/cleanup or teardown, retention, and rollback ref.
- Without PASS and clean REPORT, write `STOPPED — <reason>` and perform zero production mutation.
- Web/server lane: after its PASS only, invoke Phase 04 automatic promotion for bug reporting and offline persistence on the permanent-manifest current LXC target. Verify HEAD/build/APIs/realms/scenarios/errors/performance/cleanup and roll back automatically on failure. Phase 04 never promotes desktop/store artifacts.
- Signed-artifact lane: issue a separate PASS only after an externally signed artifact is bound to the unsigned candidate by hash and its expected package identity, signature, certificate chain, timestamp, signer authority, malware verdict, and native smoke all verify. Missing signing evidence is PENDING, never inferred.
- Store-publication lane: Phase 47 implementation and Phase 04 never publish. Only an externally authorized store-channel publisher may submit after signed-artifact PASS; record the publisher authority plus immutable submission/receipt/channel/status evidence. Without that evidence, report NOT PUBLISHED and do not claim success.

STEP 4 - UPDATE DOCS, QA ARTIFACTS, AND MEMORY:
- Complete only with evidence and dedicated verdict.
- Append LEDGER with timestamp/candidate/environment/failures/fixes/SHAs/validations/result/next.
- Update state/progress/inventory/permanent guards; externalize deferrals; record memory if used.

Step 5 is intentionally absent. It is reserved for Phase 48 packet teardown.

STEP 6 - FINAL RESPONSE FORMAT:
Report verdict, finding/fix counts, SHAs, validations, environment, QA artifacts, cleanup, promotion/operation/rollback, flags, deferrals, and Phase 48 handoff.

STOPPING RULES:
- Stop rather than weaken determinism, authority, privacy, migration, identity, or QA-before-mutation.
- Missing evidence is not PASS.
- Do not overwrite dirty user files without three-way reconciliation.
- Do not require/store signing keys in repository or planning docs.
- Never use Phase 04 as evidence of signing or store publication, and never treat a signed artifact as a publication receipt.
- Do not publish from implementation; do not claim external publication without explicit publisher authority and channel receipt/status evidence.
~~~
