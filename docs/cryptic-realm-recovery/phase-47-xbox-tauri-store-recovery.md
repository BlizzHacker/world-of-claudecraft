# Phase 47: Recover Xbox, Tauri, and Store Distribution

## Purpose

Preserve current user store work, reconcile historical Xbox/Tauri changes, and prepare three explicitly separate evidence lanes: Phase 04 LXC web/server promotion, signed distribution-artifact verification, and externally authorized store-channel publication.

## Deliverables

- Inventory dirty/current and historical F-026 files, preserve user changes, classify package identity/capabilities/assets/version/config, and recover only missing behavior.
- Validate Tauri Rust/config/store/MSIX and Xbox package generation with target-neutral fixtures, path-safe scripts, deterministic metadata, and signing separated from source.
- Run bug-reporting and offline-persistence integration alongside desktop/store login/realm/controller/co-op smoke.
- Prepare separate immutable evidence records for (a) the LXC web/server candidate eligible only for Phase 04 promotion, (b) unsigned build outputs and externally signed-artifact verification inputs, and (c) a store-publication handoff requiring an authorized publisher and channel receipt; implementation never signs, submits, publishes, or claims publication.

### Starter Prompt

~~~text
This is Phase 47 of Cryptic Realm Recovery and Modernization: Recover Xbox, Tauri, and Store Distribution.

Model and harness: Codex, best available model, high/max reasoning. Use Opus 4.8 only when selectable. If Workflow/ultracode is unavailable, use explicit bounded waves of generic subagents limited by the runtime's available worker slots, with a merge barrier and adversarial verification.

Batch orchestration: prefer an ultracode Workflow with a CSV row per inventory, candidate, or scenario and one reported result per row. If unavailable, fan out only to currently available worker slots, then merge at a barrier.

Goal: Preserve current user store work, reconcile historical Xbox/Tauri changes, and prepare independently auditable web/server, signed-artifact, and external-publication lanes without publishing from implementation.

STEP 0 - PRE-FLIGHT:
- Verify branch and git status; preserve unrelated/concurrent work; record phase-start commit and UTC timestamp.
- Confirm Phase 46 QA is complete.
- Read progress.md and state.md first. Preserve completed evidence.
- Scan Codex memory if available. Use an isolated worktree for overlapping integration.
- Confirm incomplete feature flags are default-off. Implementation sessions never mutate production.

STEP 1 - LOAD CONTEXT:
Spawn an Explore subagent to read and summarize:
- docs/cryptic-realm-recovery/state.md
- docs/cryptic-realm-recovery/progress.md
- docs/cryptic-realm-recovery/feature-inventory.md
- docs/cryptic-realm-recovery/qa-checklist.md
- docs/cryptic-realm-recovery/phase-47-xbox-tauri-store-recovery.md
- config/cryptic-recovery/features.json if it exists
- docs/operations/cryptic-recovery-runbook.md if it exists
- src-tauri
- scripts/build_tauri_msix.mjs
- scripts/build_xbox_msix.mjs
- docs/microsoft-store-release.md
- docs/xbox-store-release.md
- tests/tauri_store_config.test.ts
- dirty worktree inventory
- Phase 04 current-environment manifest and LXC-only promotion contract
- signing-channel authority policy, expected certificate identity/chain/timestamp rules, artifact hashes, and verification tooling; never load private signing material
- external store-channel publisher authority requirements and the receipt/submission/status evidence schema; implementation does not access publisher credentials
- Root AGENTS.md and CLAUDE.md plus every governing area CLAUDE.md

Return exact behavior, refs, entrypoints, tests, schema/wire/i18n/assets/config, environment identity, concurrent risks, completed evidence, and drift. For external APIs/SDKs/formulas/licenses, spawn web research using current primary sources and mark unverifiable facts OPEN.

STEP 2 - CHOOSE ORCHESTRATION AND EXECUTE:
Request this split explicitly. Give agents only the Explore summary and owned files.

Domain/authority agent:
- Inventory dirty/current and historical F-026 files, preserve user changes, classify package identity/capabilities/assets/version/config, and recover only missing behavior.
- Validate Tauri Rust/config/store/MSIX and Xbox package generation with target-neutral fixtures, path-safe scripts, deterministic metadata, and signing separated from source.

Integration/evidence agent:
- Run bug-reporting and offline-persistence integration alongside desktop/store login/realm/controller/co-op smoke.
- Produce three non-interchangeable manifests: `web_server_candidate` for the current LXC target and Phase 04 only; `distribution_artifact` with unsigned hash plus slots for external signer identity, certificate chain, timestamp, signed hash, and verification verdict; and `store_publication` with required publisher authority and external channel receipt/submission/status. Do not sign, invoke a store API, submit, publish, or mark either external step complete.

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
- Signing an artifact, using signing/publisher credentials, invoking Partner Center or another store API, publishing to any external channel, or treating Phase 04 LXC promotion as desktop/store publication.

STEP 3 - VALIDATION AND MULTI-AGENT REVIEW:
Run separately:
- npx vitest run tests/tauri_store_config.test.ts tests/version_sync.test.ts tests/native_attestation.test.ts
- cargo check --manifest-path src-tauri/Cargo.toml
- npm run tauri:build:store
- npm run tauri:build:msix
- npm run xbox:build:msix
- npm run gate
- npm run security:gate
- verify the three manifests cannot substitute for each other and that implementation commands cannot reach signing or store-publication endpoints

Diff-gated reviewer dispatch:
- Build the reviewer set from the phase-start diff, exercised surfaces, and actual risk. Usually dispatch one or two reviewers; docs/test-only diffs may need none.
- Derive concurrency from currently available agent slots; never hardcode a worker count.
- If matched by the actual diff or exercised risk, read .claude/agents/privacy-security-review.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/cross-platform-sync.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/qa-checklist.md completely and give it to a fresh generic read-only subagent.
- If matched by the actual diff or exercised risk, read .claude/agents/test-coverage-auditor.md completely and give it to a fresh generic read-only subagent.
- At release checkpoints, always read .claude/agents/release-malware-audit.md completely and give it to a fresh generic read-only subagent or use woc-release-malware-audit.
- Add any reviewer matched by the actual diff.
- Request COVERAGE and BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT.
- Fix all BLOCKING and SHOULD-FIX findings before commit.

STEP 4 - COMMIT CADENCE:
- feat(desktop): recover store packaging
- test(desktop): guard tauri xbox artifacts
- chore(release): prepare distribution checkpoint

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] User store work is preserved and F-026 has explicit disposition.
- [ ] Tauri/store/Xbox configs, identity, versions, assets, capabilities, and artifacts validate.
- [ ] No signing secret enters Git/logs/artifacts unexpectedly.
- [ ] LXC web/server promotion, signed-artifact verification, and external store publication have separate authority, immutable identity/hash, verdict, and receipt fields and cannot imply one another.
- [ ] Implementation performs no signing or external store submission/publication; missing external authority/evidence remains explicitly pending.

STEP 6 - DOC, QA ARTIFACT, AND MEMORY UPDATES:
- Update progress/state/inventory/permanent guards with UTC timestamps, SHAs, identifiers, tests, verdicts, evidence, risks, next action.
- Append LEDGER. REPORT uses id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- Record durable memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status, files, commits, validation, reviewers, QA artifacts, deferrals, feature flags, and Phase 47 QA handoff.

STOPPING RULES:
- Do not overwrite dirty user files without three-way reconciliation.
- Do not require/store signing keys in repository or planning docs.
- Do not invoke signing or external store publication from this implementation phase.
- Do not route desktop/store artifacts through the Phase 04 LXC web/server promotion path.
~~~
