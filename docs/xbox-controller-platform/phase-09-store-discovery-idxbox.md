# Phase 09: Store Discoverability and ID@Xbox Readiness

### Starter Prompt

```text
This is Phase 09 of the Xbox Controller Platform feature: Store Discoverability and ID@Xbox Readiness.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` if the listing, policy, market, language, and certification inventory
requires a batch audit with adversarial verification.

Goal: Produce an accurate, policy-compliant, evidence-backed path for Cryptic Realm Store ID
`9P34BZH26X6Z` to become public, browsable, acquirable, and ID@Xbox-ready without misclassification,
misrating, secret exposure, or an unconfirmed Partner Center publication.

STEP 0 - PRE-FLIGHT:
- Record `git status --short --branch` and the phase-start commit. Preserve unrelated and generated-file changes;
  stop if dirty paths overlap phase-owned manifests, build profiles, or Store documentation.
- Scan memory, if used, for Microsoft Store, Xbox Creators Program, ID@Xbox, IARC, Store-safe build profile,
  package identity, Partner Center, signed-in browser controls, and action-time confirmation rules.
- Confirm Phase 08 QA is green and the locked decision remains: Cryptic Realm is a game, not an Entertainment app;
  its Microsoft/Xbox build excludes cash-reward and crypto benefits, while the web edition remains separately disclosed.

STEP 1 - LOAD CONTEXT:
Spawn an Explore agent to read and summarize:
- `docs/xbox-controller-platform/state.md`, `progress.md`, and this phase file
- `docs/xbox-store-release.md`, `docs/microsoft-store-release.md`, and `PACKAGING.md`
- `shell/CrypticRealm.Shell/Package.appxmanifest` and the shell project file
- `src-tauri/tauri.microsoftstore.conf.json` only to confirm Tauri remains desktop-only
- `scripts/build_xbox_msix.mjs`, `scripts/build_xbox_tiles.py`, and `scripts/deploy_xbox.ps1`
- `public/manifest.webmanifest`, relevant Store assets under `shell/CrypticRealm.Shell/Assets/`
- Store-safe feature gates, wallet/reward surfaces, privacy, terms, support, and account deletion pages found by search
- Existing listing notes and assets under `docs/microsoft-store-assets/`, without treating generated assets as source
- `AGENTS.md`, `docs/CLAUDE.md`, `scripts/CLAUDE.md`, and relevant source CLAUDE files
Return package identity, device families, versioning, capabilities, Store-safe feature gate, disclosed features,
asset inventory, current documented listing state, missing evidence, and exact source/build ownership.

In parallel, spawn a web-research agent restricted to current primary Microsoft and IARC sources. Research:
- Xbox Creators Program visibility and acquisition limits
- Public, discoverable, browsable, curatable, purchasable, and redeemable catalog concepts
- ID@Xbox concept approval, onboarding, managed partner, certification, Xbox services, identity, privileges,
  parental controls, multiplayer, chat, safety, accessibility, privacy, and age-rating requirements
- Current Partner Center package, listing, market, pricing, release, and availability controls
- Accurate IARC treatment of cash rewards, crypto, gambling-like mechanics, user communication, and online interaction
Return dated citations and mark unavailable, NDA-only, account-specific, or unverifiable facts OPEN.

Use the available `computer-use:computer-use` skill for a read-only Partner Center audit in Brave. Discover
whether an authenticated session is available; do not assume one. Follow the skill's initialization, guidance,
current-state observation, and confirmation rules. Capture sanitized evidence for:
product identity, submission status, packages, device families, availability, visibility, markets, pricing,
release timing, listings, age ratings, policy warnings, and catalog capabilities. Do not expose account details,
tokens, emails, IDs unrelated to the product, or signing data. Do not save or publish during the audit.

STEP 2 - CHOOSE ORCHESTRATION + EXECUTE:
Request explicit parallel fan-out after the audits. Use disjoint ownership and only summarized context.

Store-safe build and metadata agent deliverables:
- Verify the Microsoft/Xbox build cannot expose wallet, token, cash-reward, purchase-benefit, or misleading links,
  copy, UI, deep links, network calls, or cached assets. Keep the web edition behavior separate and disclosed.
- Make package identity, Xbox device family, RETAIL configuration, version, capabilities, Store association,
  and release artifact traceable and reproducible. Do not repurpose the desktop Tauri package for Xbox.
- Draft accurate listing copy, privacy/support disclosures, feature declarations, system requirements,
  controller requirements, accessibility details, and rating answers. Never optimize by concealing a feature.

Discoverability and availability agent deliverables:
- Produce a before-and-after evidence checklist for Public, Discoverable, release-now, free pricing,
  target markets, Xbox device family, acquisition enabled, RETAIL package, and expected Xbox catalog capabilities.
- Draft the post-publication signed-out and Xbox-device verification matrix for a separate authorized session.
  Explain how to distinguish delayed propagation from configuration failure and which timestamps to record.
- Do not reclassify the game as an app to gain search visibility.

ID@Xbox dossier agent deliverables:
- Prepare a concise concept/onboarding dossier: vision, audience, game loop, progression, differentiation,
  controller-first experience, online architecture, moderation, accessibility, business model, roadmap,
  footage/screenshots status, team identity, support readiness, and requested platform capabilities.
- Create an implementation plan for Xbox identity, gamertag display, account linking, privilege checks,
  parental controls, multiplayer/chat gating, safety, telemetry, sandbox/title IDs, certification, and test accounts.
- Mark every item requiring Microsoft approval, credentials, NDA documentation, or Partner Center access as OPEN.

INVARIANTS THIS PHASE MUST KEEP:
- Ratings, questionnaires, listings, capabilities, and business-model statements are exact and supportable.
- The Microsoft/Xbox build is cash-reward and crypto-benefit-free by construction and test, not only by copy.
- Package identity and Store association do not change without explicit evidence and approval.
- Credentials, signing material, account data, Partner Center tokens, and NDA content never enter source or screenshots.
- Any Partner Center publication or submission is an external representational action and requires action-time user confirmation.

Out of scope:
- Saving or publishing a submission, changing the product from game to app, inventing Xbox service access,
  accepting legal agreements, purchasing services, deploying production, or generating misleading ratings answers.
- Final gameplay screenshot capture, WACK completion, or certification submission, which belong to Phase 10.

STEP 3 - VALIDATION + MULTI-AGENT REVIEW:
- Run the Store-safe feature-gate tests, `npx tsc --noEmit`, relevant package/manifests tests, a clean UWP/MSIX build,
  package identity inspection, and static scans for excluded wallet/reward/crypto code, copy, URLs, and assets.
- Validate all required listing assets for exact dimensions, file formats, safe zones, title treatment, and source provenance.
- Cross-check every IARC and listing answer against shipped behavior and the cited current policies.
- Dispatch `privacy-security-review` for auth, privacy, package, deploy, secrets, or external-account surfaces.
  Dispatch `qa-checklist` when complete; dispatch other specialists only if their exact diff surfaces match.
  Ask for COVERAGE and clear all BLOCKING findings before committing.
- Prepare a draft publication diff and evidence summary, but do not save or publish in Phase 09. Record the
  exact action that a separate post-Phase-10-QA publication session would take after fresh user confirmation.
- Verify the current signed-out web listing, Xbox search, acquisition, installation eligibility, package/version,
  and catalog capabilities as a read-only baseline. Publication and propagation verification may occur only in
  that separate post-Phase-10-QA action session; never repeatedly resubmit to force indexing.

STEP 4 - COMMIT CADENCE:
Use explicit paths, never `git add -A`, with focused commits such as:
- `feat(store): enforce xbox safe build profile`
- `docs(store): prepare accurate xbox listing and rating`
- `docs(xbox): add idxbox onboarding dossier`
- `test(store): verify xbox package and excluded features`
Store publication is not part of Phase 09 and may occur only after Phase 10 QA in a separate confirmed action session.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] The Xbox artifact is UWP WebView2, RETAIL, correctly associated, reproducible, and targets Xbox devices.
- [ ] Automated and manual checks prove no wallet, token, cash-reward benefit, misleading link, or related network call ships.
- [ ] IARC answers and listing claims exactly match the submitted build, online interaction, and business model.
- [ ] Availability review covers public, discoverable, browsable, acquirable, free, markets, release timing, and package status.
- [ ] The ID@Xbox dossier and identity/privilege/parental-control/multiplayer/chat plan are complete, with OPEN items explicit.
- [ ] Partner Center evidence is sanitized and no secret or unrelated account data is retained.
- [ ] No publish, save, or submission action occurs in Phase 09.
- [ ] The separate post-Phase-10-QA publication and propagation verification runbook is complete and requires fresh user confirmation.

STEP 6 - DOC UPDATES + MEMORY:
- Update `progress.md` and `state.md` with build-profile gates, package identity, rating decisions,
  current availability evidence, draft submission references, citations, and OPEN items.
- Record surprising Store or ID@Xbox rules in memory if used, without account-private data.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files and artifacts, current versus target catalog state, Store-safe proof, rating and listing
evidence, ID@Xbox dossier status, validation, reviewer verdicts, publication-readiness status, baseline catalog results,
OPEN items, and a one-line handoff to Phase 09 QA.

STOPPING RULES:
- Stop if any rating or policy answer cannot be supported by shipped behavior and current primary documentation.
- Stop before changing identity, classification, legal agreements, credentials, pricing model, or package association without approval.
- Do not publish, save, or submit in Phase 09. Leave that action for a separate session after Phase 10 QA is green.
```
