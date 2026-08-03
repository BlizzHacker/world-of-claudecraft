# Phase 02: Microsoft and Xbox Store-Safe Product Profile

## Purpose

Create a truthful Microsoft Store build profile in which cash-reward, crypto-wallet, token-claim, and token-gated benefits are absent from the packaged experience and rejected by authoritative server policy, while the web edition retains its separately configured and accurately disclosed behavior. The profile must be a shared, testable policy seam, not a scattering of UI-only flags.

## Deliverables

- Define a typed release/product profile shared by build, client presentation, and server policy, with a locked `microsoft-store` profile and an explicit web profile.
- Remove Microsoft-build access to wallet linking, token claims, cash-equivalent daily rewards, token-gated benefits, and promotional copy while preserving ordinary in-game, non-cash progression.
- Enforce restricted capabilities server-side using trusted deployment configuration or verified native context. Never trust a client-supplied profile alone.
- Produce auditable listing, policy, and IARC evidence that states what the build actually does. Do not answer or manipulate Partner Center questionnaires in this phase.

### Starter Prompt

~~~text
This is Phase 02 of Xbox Controller Platform: Microsoft and Xbox Store-Safe Product Profile.

Model and harness: Use Codex with the best available model and high or maximum reasoning. Use named historical harnesses such as Opus 4.8 or ultracode only if the current runtime exposes them. Otherwise explicitly fan out bounded Codex agents within available slots, merge at a barrier, and run adversarial verification. Never claim an unavailable model or an unrun Store/certification result.

Goal: Implement one authoritative product-profile seam so Microsoft packages contain no cash-reward, crypto-wallet, token-claim, or token-gated benefit surface, while the web profile remains accurate and functional, with truthful evidence for later legal, listing, and IARC work.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root `AGENTS.md`, root `CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `src/ui/CLAUDE.md`, `src/net/CLAUDE.md`, `server/CLAUDE.md`, `server/http/CLAUDE.md`, `docs/CLAUDE.md`, and `scripts/CLAUDE.md`.
- Read all packet cross-cutting docs, Phase 01 implementation/QA outcomes, this file, and the approved product decision in `brainstorm.md` and `state.md`.
- Scan memory if available. Record branch, phase-start SHA, UTC timestamp, dirty paths, Phase 01 artifact/profile inputs, and concurrent ownership. Preserve unrelated work and stage exact paths only.
- Confirm Phase 01 QA passed. This phase may change local source and tests only. It must not mutate production, Partner Center, IARC, Store availability, or a published package.

STEP 1 - EXPLORE CONTEXT:
Spawn read-only Explore agents to return focused summaries of:

Policy and server authority:
- `server/economy/release_channel.ts`, `server/economy/api.ts`, `server/economy/db.ts`, `server/economy/solana_verify.ts`
- `server/wallet.ts`, `server/wallet_link.ts`, `server/daily_rewards.ts`, `server/daily_rewards_db.ts`, `server/bank_entitlements.ts`, `server/native_attestation.ts`, `server/main.ts`
- `server/http/config.ts`, `server/http/registry.ts`, `server/http/middleware/origin_check.ts`, `server/http/middleware/bearer_active_guard.ts`
- `src/economy/types.ts`, `src/economy/chainAdapter.ts`, `src/economy/walletService.ts`, `src/economy/platinum_rules.ts`
- inline DDL and persistence ownership in `server/db.ts` and affected `server/*_db.ts`

Client and package surfaces:
- `src/game/client_env.ts`, `src/game/browser_env.ts`, `src/client_origin.ts`, `src/main.ts`, `src/landing.ts`, `index.html`, `vite.config.ts`
- `src/ui/cryptic/wallet_panel.ts`, `src/ui/cryptic/wallet_panel_core.ts`, `src/ui/wallet_balance.ts`, `src/ui/daily_rewards_window.ts`, `src/ui/account_portal.ts`, `src/ui/cryptic/links_rebrand.ts`
- `src/ui/i18n.catalog/`, `src/ui/i18n.locales/`, and generated-i18n ownership
- `shell/CrypticRealm.Shell/`, canonical Xbox build configuration, `src-tauri/tauri.microsoftstore.conf.json`, and `scripts/build_tauri_msix.mjs`
- `docs/microsoft-store-release.md`, `docs/xbox-store-release.md`, `docs/CRYPTIC_REALM_TOKEN.md`, `docs/CRYPTIC_REALM_WHITEPAPER.md`, `docs/CRYPTO_CUSTODY_RUNBOOK.md`, and relevant PRDs

Tests and evidence:
- `tests/economy_core.test.ts`, `tests/wallet*.test.ts`, `tests/server/wallet.test.ts`, `tests/daily_rewards*.test.ts`, `tests/server/daily_rewards_routes.test.ts`, `tests/durance_tester_entitlement.test.ts`, `tests/native_attestation.test.ts`, `tests/tauri_store_config.test.ts`, `tests/xbox_env.test.ts`, `tests/i18n_completeness.test.ts`, and `tests/localization_fixes.test.ts`

Reports must enumerate every cash-equivalent, wallet, crypto, token, payout, claim, holder-tier, reward-multiplier, entitlement, copy, API, internal API, build variable, and persisted record that could affect the Microsoft experience. Distinguish display-only surfaces from authoritative benefits. Identify whether a trusted server-side channel signal already exists. Mark OPEN gaps.

Spawn a separate web-research agent for current Microsoft Store, Xbox, IARC, ESRB, PEGI, and ID@Xbox policy. Use official primary sources and dated citations. Ask specifically about cash prizes/rewards, blockchain/crypto, gambling/simulated gambling, multiplayer/chat program requirements, questionnaire obligations, content declarations, and certification evidence. Mark anything unverifiable OPEN. Research informs implementation and a later publisher handoff; it never authorizes deceptive answers.

STEP 2 - ORCHESTRATE AND EXECUTE:
Request a bounded vertical split and give each agent only the Explore/research summaries plus owned files.

Shared profile and build slice:
- Introduce one typed product-profile module with exhaustive capabilities, for example `cashRewards`, `walletLink`, `tokenClaims`, `tokenBenefits`, and `cryptoPromotion`, plus safe defaults and fail-closed decoding. Use repository naming found during exploration rather than blindly copying this example.
- Make `microsoft-store` a build-time locked profile for UWP Xbox and Microsoft Tauri/MSIX. Ensure ordinary web builds retain the explicit web profile. Do not use hostname or a mutable query parameter as the only selector.
- Emit the selected non-secret profile into package evidence and tests. Build scripts must fail if a Microsoft package is produced with restricted capabilities enabled.

Server-authority slice:
- Gate every restricted API and benefit at the authoritative server boundary. A hidden button is not enforcement.
- Prefer trusted deployment configuration and, only where already sound, verified native attestation/origin binding. Treat any client-declared profile as advisory and spoofable.
- Define stable disabled behavior for status/read and mutation endpoints. Prevent linking, claims, payouts, holder-gated benefits, reward multipliers, and internal settlement from being reachable through the Microsoft profile.
- Preserve the web profile and existing account data. Do not delete wallet links, balances, rewards, or schema. Microsoft-profile access must not mutate or leak restricted data.

Client and content slice:
- Remove restricted navigation, panels, calls, links, reward claims, and promotional copy from the Microsoft build. Direct deep links must degrade to an honest unavailable message or safe destination.
- Preserve normal login, realm selection, characters, gameplay loot/XP/gold, achievements, cosmetic presentation not gated by token ownership, and non-cash daily engagement only if product/legal evidence supports it.
- Add English i18n source keys first and fill every locale as repository rules require. Regenerate resolved catalogs through scripts; never hand-edit generated output.

Evidence slice:
- Create a machine-readable feature inventory comparing web and Microsoft profiles, including client visibility, network calls, server authorization, persistence effects, package-string/content scan, and expected listing disclosure.
- Draft a publisher-facing evidence checklist for listing text and IARC answers. State facts and cite policy; do not choose dishonest answers, minimize regulated content, or save external forms.

INVARIANTS:
- NON-NEGOTIABLE: restricted benefits are rejected server-side. Client hiding alone cannot satisfy this phase.
- NON-NEGOTIABLE: the Microsoft profile is fail-closed and cannot be changed by local storage, query string, arbitrary JavaScript, forged header, or unverified client message.
- Web behavior remains explicitly configured and accurately disclosed; no destructive migration or account-data erasure.
- No gameplay outcome moves from the shared deterministic sim to client or ad hoc server code.
- `IWorld`, Sim, ClientWorld, wire, and headless parity remain unchanged unless an observed requirement demands a deliberate, fully mirrored extension.
- DDL, if unavoidable, is additive, idempotent, indexed, boot-safe, and backward compatible. Prefer no schema change.
- Every visible string is localized; server emits stable language-agnostic codes/text handled by existing localization seams.
- No secret, mint authority, wallet key, certificate, or publisher credential enters source or evidence.

OUT OF SCOPE:
- Partner Center edits, questionnaire submission, IARC retake, rating manipulation, ID@Xbox application, package signing/publishing, production configuration changes, deletion of web crypto features, new cash rewards, token design, economy rebalance, and controller UX.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run focused tests selected from the changed surfaces, including:
- `npx vitest run tests/economy_core.test.ts tests/wallet.test.ts tests/wallet_server.test.ts tests/wallet_browser.test.ts tests/wallet_balance.test.ts tests/wallet_panel_core.test.ts tests/server/wallet.test.ts`
- `npx vitest run tests/daily_rewards.test.ts tests/daily_rewards_window.test.ts tests/server/daily_rewards_routes.test.ts tests/durance_tester_entitlement.test.ts`
- `npx vitest run tests/native_attestation.test.ts tests/tauri_store_config.test.ts tests/xbox_env.test.ts`
- new profile tests covering web enabled, Microsoft disabled, missing/unknown fail-closed, forged client/profile/header/query, direct API/deep link, internal payout, persisted-data non-mutation, and package build guard
- `npx vitest run tests/i18n_completeness.test.ts tests/localization_fixes.test.ts`
- `npx tsc --noEmit`
- build web and Microsoft artifacts, inspect package content and JavaScript/string/network surfaces, and prove the Microsoft artifact contains no reachable restricted feature
- `npm run security:gate`

Dispatch reviewers based on the actual diff after reading their instructions fully. Privacy/security review is mandatory for auth, native-attestation, API, secret, wallet, and policy changes. Migration-safety is mandatory if DDL or JSONB save shape changes. Cross-platform-sync is mandatory only if IWorld, sim, net, wire, matchers, or headless surfaces change. Dispatch test-coverage review for implementation and `qa-checklist` when the deliverable set is complete. Request COVERAGE and structured BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. Fix all BLOCKING and SHOULD-FIX findings.

STEP 4 - COMMIT CADENCE:
- `feat(release): add authoritative product profiles`
- `fix(economy): disable restricted benefits for microsoft store`
- `feat(ui): present store-safe microsoft experience`
- `test(release): prove microsoft profile exclusions`
- `docs(store): record truthful product evidence`
Use fewer commits if atomicity requires it. Stage explicit paths only.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] One typed profile seam controls build, client, and server behavior with explicit web and locked Microsoft profiles.
- [ ] Microsoft packages expose no wallet link, token claim, crypto promotion, cash-equivalent reward, payout, reward multiplier, or token-gated benefit.
- [ ] Direct API, forged client, deep link, query, storage, and header attempts fail at the server-authoritative boundary without restricted data mutation or leakage.
- [ ] The web profile retains its approved behavior and existing data remains intact.
- [ ] Ordinary game progression remains functional and is not accidentally classified as a cash/token benefit.
- [ ] Machine-readable package evidence and a truthful human listing/IARC checklist agree with observed behavior and cited current policy.
- [ ] No external form, production service, package signing, or publication state was changed.
- [ ] Tests, builds, i18n gates, security checks, and matched reviewers pass.

STEP 6 - DOCS, STATE, AND MEMORY:
- Update packet `progress.md`, `state.md`, `qa-checklist.md`, and product-profile evidence with exact capabilities, trusted inputs, endpoint behavior, build commands, artifact hashes, tests, SHAs, citations, OPEN policy items, and Phase 02 QA handoff.
- Record durable memory if available, especially why client-only gating was rejected.

STEP 7 - FINAL RESPONSE:
Report outcome, exact profile matrix, authoritative enforcement points, files/commits, build artifacts/hashes, tests, reviewers, policy evidence, retained web behavior, untouched external systems, OPEN publisher decisions, and the Phase 02 QA entrypoint.

STOPPING RULES:
- Stop if a restricted benefit can be reached by forging client state or if disabling it would destroy web/account data.
- Stop and mark OPEN if policy or rating meaning is uncertain. Never guess or optimize questionnaire answers for a lower rating.
- Stop before production, Partner Center, IARC, signing, or publication mutation.
- Never weaken auth, origin, native attestation, server authority, privacy, or auditability.
~~~
