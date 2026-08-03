# Phase 10: Truthful Screenshots, Hardware QA, and Release Handoff

### Starter Prompt

```text
This is Phase 10 of the Xbox Controller Platform feature: Truthful Screenshots, Hardware QA, and Release Handoff.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` for the full progression, hardware, WACK, artifact, and certification
matrix so each result receives adversarial verification.

Goal: Produce truthful Cryptic Realm progression screenshots, physical Xbox controller evidence,
a clean Windows App Certification Kit and artifact record, and a complete certification handoff without
altering Romm screenshots, fabricating gameplay, exposing accounts, or bypassing release gates.

STEP 0 - PRE-FLIGHT:
- Record `git status --short --branch`, phase-start commit, and all concurrent dirty paths. Preserve them.
  Stop if capture, Store-asset, shell, or release paths overlap unexplained work.
- Scan memory, if used, for progression capture, screenshot provenance, multiplayer drivers, Xbox hardware,
  WACK, Store art, package signing, recovery manifest, production restrictions, and shared-worktree commits.
- Confirm Phase 09 QA is green, including the Store-safe build profile and exact package identity.
- Do not touch Romm/Cartridge screenshots. Do not deploy or mutate production during this phase.

STEP 1 - LOAD CONTEXT:
Spawn focused Explore agents in parallel.

Capture Explore reads and summarizes:
- `docs/xbox-controller-platform/state.md`, `progress.md`, and this phase file
- `scripts/pr_screenshots.mjs`, `scripts/visual_tour.mjs`, `scripts/gamepad_shot.mjs`
- `scripts/coop_demo_shots.mjs`, `scripts/arena_visual.mjs`, `scripts/water_1518_screenshots.mjs`
- Other current progression, dungeon, social, gear, accessibility, and Store capture scripts found with `rg`
- `src/render/screenshot.ts`, relevant screenshot docs/assets, and current Microsoft Store asset inventory
- Progression/zone/dungeon source and design docs sufficient to verify Eastbrook, Grix, Mirefen,
  Sunken Bastion, Stormcrag, Drowned Temple, Gravewyrm, Hollow Crypt, arena, and level-20 gear are shipped
- `AGENTS.md`, `docs/CLAUDE.md`, `scripts/CLAUDE.md`, relevant sim/content CLAUDE files, and `tests/CLAUDE.md`
Return exact reachable scenes, truthful state requirements, capture commands, viewport requirements,
account setup, multiplayer needs, privacy risks, current asset filenames/dimensions, and stale captures.

Hardware and release Explore reads and summarizes:
- `shell/CrypticRealm.Shell/Package.appxmanifest`, shell project, bridge, and Xbox assets
- `scripts/build_xbox_msix.mjs`, `scripts/build_xbox_tiles.py`, `scripts/verify_xbox_pad.mjs`
- `docs/xbox-store-release.md`, `docs/microsoft-store-release.md`, `PACKAGING.md`
- Current WACK/build/signing scripts, tests, CI workflow, privacy/support/terms/account-deletion pages
- Phase 06 through 09 evidence recorded in `state.md` and `progress.md`
- Root and relevant shell/scripts/tests instruction files
Return package inputs, version/identity, WACK procedure, hardware matrix, certification evidence inventory,
signing-secret boundaries, current failures, and missing handoff items.

Spawn a current primary-source Microsoft research agent for Store screenshot rules, accessibility declarations,
WACK tooling and interpretation, package validation, Xbox certification submission evidence, and ID@Xbox handoff.
Return dated citations and mark NDA-only, account-specific, hardware-unavailable, or unverifiable items OPEN.

STEP 2 - CHOOSE ORCHESTRATION + EXECUTE:
Request explicit fan-out. Prefer capture, hardware, and release-evidence agents with disjoint ownership.

Truthful progression capture agent deliverables:
- Build a shot manifest with scene, actual character level/gear, party state, input device, build commit,
  UTC timestamp, viewport, script, source file, and Store slot. Capture a coherent progression story:
  Eastbrook, Grix, Mirefen, Sunken Bastion, Stormcrag, Drowned Temple, Gravewyrm, a real Hollow Crypt party,
  a real arena match, and a genuinely equipped level-20 hero.
- Capture actual runtime frames only. Do not use AI generation, composite gameplay, substitute concept art,
  fake multiplayer entities, relabel locations, or claim inaccessible content. Cropping, lossless resizing,
  and approved logo placement are allowed only when recorded and must not change gameplay facts.
- Use namespaced local or isolated-stage accounts and real concurrent clients for party and arena scenes.
  Local dev commands may shorten setup only when disclosed in the manifest; they must not appear in production.
- Protect account names, chat, tokens, server addresses, moderation details, and personal data. Ensure every frame
  is legible at Store thumbnail size and follows the current Store-safe feature profile.

Xbox hardware QA agent deliverables:
- Run controller-only cold-start through gameplay and shutdown on each available Xbox One and Xbox Series model.
  Cover sign-in/OSK, all menus, chat isolation, gameplay actions, scrolling, overlay/cancel, disconnect/reconnect,
  suspend/resume, rumble, multiple pads where available, long-session stability, network loss, and recovery.
- Record console model/generation, OS build, controller model/firmware, wired/wireless path, package version,
  build commit, expected/actual result, logs, sanitized screenshots/video, and PASS/FAIL for every case.
- Mark unavailable hardware or Xbox-service access OPEN. Never convert an untested case to PASS.

Artifact and certification agent deliverables:
- Produce a clean, reproducible UWP/MSIX release candidate from the Store-safe profile. Record hashes,
  package identity/version/architecture, toolchain, build commands, dependency lock state, and signing boundary.
- Run WACK on the exact candidate and retain the machine-readable and human-readable report. Triage every warning
  and failure with an owner, evidence, and disposition; do not waive a result without documented authority.
- Assemble the final certification handoff: Store/ID@Xbox status, controller matrix, accessibility checklist,
  identity/privilege plan, moderation/privacy/support, rating/listing alignment, known issues, rollback reference,
  smoke tests, artifacts, hashes, screenshots, evidence index, and OPEN Microsoft/NDA items.

INVARIANTS THIS PHASE MUST KEEP:
- Screenshots and evidence are truthful, reproducible, privacy-safe, and tied to an exact build.
- The exact Store-safe Xbox candidate contains no wallet, crypto benefit, cash reward, dev command, or secret.
- Controller results are never generalized beyond tested console and controller combinations.
- WACK failures remain failures until fixed and rerun; no report is edited to manufacture a pass.
- Generated assets are produced by scripts, not hand-edited. Romm screenshots remain unchanged.
- Production recovery identity and promotion gates remain authoritative; this phase performs no production mutation.

Out of scope:
- Romm screenshot changes, AI imagery presented as gameplay, production deploy, destructive QA data writes,
  any Partner Center save/publication, ID@Xbox legal acceptance, or undocumented NDA work. Publication is a
  separate action only after Phase 10 QA is green and fresh confirmation is obtained.
- New gameplay content added only to improve marketing shots.

STEP 3 - VALIDATION + MULTI-AGENT REVIEW:
- Run the CI-equivalent gate: `npm test && npx tsc --noEmit && npm run build:env && npm run build:server && npm run build`.
- Run `npm run asset:budget`, `npm run perf:tour`, the capture manifest validator, screenshot dimension/format checks,
  Store-safe exclusion scans, clean UWP/MSIX build, package identity inspection, hash generation, and WACK.
- Run all available physical Xbox cases and local/stage multiplayer capture scripts. Verify no browser console error
  occurs in a core flow. Inspect every final image at full size and Store thumbnail size.
- Spawn `privacy-security-review` for package, auth, evidence, privacy, deploy, and secret surfaces;
  `cross-platform-sync` only if its exact simulation/network surfaces changed; `migration-safety` only for actual
  persistence changes; and `qa-checklist` for the completed deliverable set. Ask for COVERAGE, including uncertain
  findings. Clear every BLOCKING issue before release-candidate status.

STEP 4 - COMMIT CADENCE:
Use explicit paths, never `git add -A`, with focused commits such as:
- `test(xbox): add physical console release matrix`
- `docs(store): replace cryptic realm progression captures`
- `chore(release): record xbox package and wack evidence`
- `docs(xbox): assemble certification handoff`
Do not commit secrets, private logs, signing material, or oversized raw recordings.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] The final shot manifest contains all ten progression and multiplayer scenes tied to exact real runtime state.
- [ ] Every final image is accurate, privacy-safe, correctly sized, legible, and free of excluded Store-build features.
- [ ] Hollow Crypt and arena shots use real concurrent clients; the level-20 hero is genuinely equipped.
- [ ] Available Xbox One and Xbox Series hardware passes the documented controller-only and lifecycle matrix.
- [ ] Untested hardware, SDK, service, or NDA cases are OPEN, never inferred PASS.
- [ ] The exact release candidate passes the full CI gate, asset/performance gates, package inspection, and WACK.
- [ ] Artifact hashes, package identity/version, toolchain, reports, rollback reference, and evidence index agree.
- [ ] The certification handoff is complete, sanitized, actionable, and contains all remaining follow-ups.
- [ ] Romm screenshots and production systems are unchanged.

STEP 6 - DOC UPDATES + MEMORY:
- Update `progress.md`, `state.md`, and `qa-checklist.md` with screenshot provenance, hardware results,
  artifact hashes, WACK report, certification evidence, reviewer verdicts, and every OPEN item.
- Record surprising capture, hardware, WACK, or certification rules in memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, exact screenshots and provenance, hardware matrix, release artifact identity and hashes,
WACK verdict, full validation, reviewer verdicts, certification handoff path, OPEN items, no-production/no-Romm-change
confirmation, and a one-line handoff to final Phase 10 QA.

STOPPING RULES:
- Stop if a screenshot cannot be proven truthful or would expose private data, dev tooling, or excluded features.
- Stop if WACK, CI, Store-safe scans, package identity, or an available required hardware case is red.
- Stop before production mutation, signing-secret access, Store publication, or legal acceptance. Store publication
  is never part of Phase 10 implementation, even if a prior phase received general approval.
```
