# Phase 01: Canonical Xbox Release Lane and Branch Recovery

## Purpose

Recover one reproducible Xbox source lane, designate the UWP WebView2 project as the sole console shell, and bind every package to an exact source commit, package identity, version, configuration, and artifact hash. This phase is local and evidentiary. It does not mutate production, Partner Center, or any installed console.

## Deliverables

- Reconcile the current branch, the dirty worktree, commit `888bb3fc0`, revert `08357b322`, and any other relevant history without overwriting user work. Restore only proven-required source, including the missing `src/client_origin.ts` and `src/game/console_generation.ts` seams.
- Make `shell/CrypticRealm.Shell/` the canonical UWP WebView2 console shell and retire the obsolete hosted-web package builder and contradictory release instructions without deleting useful diagnostic history.
- Define and test the `https://app.local` origin contract across the shell, client, Vite build, offline gate, and server CORS/origin checks.
- Emit an immutable Xbox candidate manifest that binds source SHA, tree state, package identity, version, target console generation, build configuration, unsigned artifact hash, and toolchain versions.

### Starter Prompt

~~~text
This is Phase 01 of Xbox Controller Platform: Canonical Xbox Release Lane and Branch Recovery.

Model and harness: Use Codex with the best available model and high or maximum reasoning. The historical feature-plan template names Opus 4.8 and ultracode; use them only if the current runtime actually exposes them. Otherwise use explicit bounded Codex subagent waves, limited by available worker slots, with a merge barrier and adversarial verification. Never claim a model, tool, build, device test, or result that did not run.

Goal: Recover one canonical, reproducible Xbox release lane around the UWP WebView2 shell, restore proven missing console-source seams, and bind an unsigned package to exact source and configuration evidence without production, console, signing, or Partner Center mutation.

STEP 0 - PRE-FLIGHT AND MEMORY:
- Read root `AGENTS.md`, root `CLAUDE.md`, `docs/CLAUDE.md`, `scripts/CLAUDE.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `src/ui/CLAUDE.md`, `src/net/CLAUDE.md`, `server/CLAUDE.md`, and `server/http/CLAUDE.md` where present.
- Read `docs/xbox-controller-platform/README.md`, `brainstorm.md`, `implementation-plan.md`, `progress.md`, `state.md`, `qa-checklist.md`, and this phase file.
- Scan `MEMORY.md` and relevant project memory if available. If none exists, record that fact rather than inventing memory.
- Record the phase-start branch, HEAD, UTC timestamp, and `git status --short`. The checkout may contain user and concurrent work. Preserve it. Never use `git add -A`, reset, checkout-overwrite, force-push, or broad cleanup.
- Confirm Phase 01 is the active phase. Do not require a clean tree when existing changes are unrelated; isolate or explicitly stage only owned paths.
- Read the permanent recovery manifest before any remote action. Production identity is Proxmox `192.168.0.6`, LXC 171, repository `/opt/cryptic-realm`; verify it read-only if needed. Do not mutate production in this phase.

STEP 1 - EXPLORE CONTEXT:
Spawn a read-only Explore agent to inspect and summarize, without editing:
- `shell/CrypticRealm.Shell.sln`
- `shell/CrypticRealm.Shell/CrypticRealm.Shell.csproj`
- `shell/CrypticRealm.Shell/Package.appxmanifest`
- `shell/CrypticRealm.Shell/App.xaml.cs`
- `shell/CrypticRealm.Shell/MainPage.xaml`
- `shell/CrypticRealm.Shell/MainPage.xaml.cs`
- `shell/CrypticRealm.Shell/GamepadBridge.cs`
- `shell/CrypticRealm.Shell/Assets/gamepad-polyfill.js`
- `shell/CrypticRealm.Probe/` as a diagnostic-only project
- `src/client_origin.ts` and `src/game/console_generation.ts` in current and historical refs
- `src/game/xbox_env.ts`, `src/game/offline_mode_gate.ts`, `src/game/client_env.ts`, `src/render/gfx.ts`, `src/main.ts`, `vite.config.ts`, and `index.html`
- `server/http/middleware/cors.ts`, `server/http/middleware/origin_check.ts`, `server/http/config.ts`, `server/main.ts`, `tests/server/http/cors.test.ts`, `tests/server/http/origin_check.test.ts`, and `tests/realm_public_origin.test.ts`
- `scripts/build_xbox_msix.mjs`, `scripts/build_xbox_tiles.py`, `scripts/deploy_xbox.ps1`, `scripts/verify_xbox_pad.mjs`, `package.json`, `docs/xbox-store-release.md`, `docs/microsoft-store-release.md`, `tests/xbox_env.test.ts`, `tests/offline_mode_gate.test.ts`, `tests/tauri_store_config.test.ts`, and `tests/version_sync.test.ts`
- Git history around `888bb3fc0` and `08357b322`, plus all commits that touched the missing files or Xbox shell, using patch and rename-aware history.

The Explore report must identify exact source-of-truth files, current and historical behavior, missing versus intentionally reverted code, duplicate package lanes, package identity/version sources, CORS/origin behavior, signing boundaries, generated assets, tests, dirty-path collisions, and OPEN facts. For WebView2, UWP, Xbox package requirements, or Microsoft tooling behavior that must be decided, spawn a separate research agent using current official Microsoft primary sources and citations. Mark unverifiable details OPEN.

STEP 2 - ORCHESTRATE AND EXECUTE:
Choose the lightest safe orchestration. Request bounded agents explicitly and give each only the Explore summary plus owned files. Use isolated worktrees only if concurrent agents would edit overlapping paths. Merge only after an integration owner checks the combined diff.

Recovery and architecture slice:
- Three-way reconcile proven required code from history. Restore `src/client_origin.ts` and `src/game/console_generation.ts` only after explaining why current imports and console behavior require them.
- Establish a typed client-origin and console-generation contract. Browser, desktop, mobile, Xbox One, and Xbox Series behavior must have safe defaults. Never trust a query string or arbitrary page script as authoritative native identity.
- Keep `shell/CrypticRealm.Probe/` diagnostic-only. Designate `shell/CrypticRealm.Shell/` as the sole console package entrypoint.

Build and origin slice:
- Replace or retire the hosted-web `scripts/build_xbox_msix.mjs` lane so `npm run xbox:build:msix` builds, or clearly delegates to, the canonical UWP WebView2 shell. Preserve useful inspection logic in a target-neutral helper where appropriate.
- Make the shell package local web assets, navigate only to `https://app.local/index.html`, constrain external navigation, and expose the minimum native bridge.
- Add `https://app.local` to explicit CORS and origin policy through the narrowest configuration seam. Do not add wildcard origins, reflect arbitrary origins, or weaken CSRF/auth checks.
- Update release documentation so Xbox UWP, Windows Tauri/MSIX, web/LXC, diagnostics, external signing, and Partner Center publication are distinct lanes.

Evidence slice:
- Create or extend deterministic tests for restored source seams, manifest/package identity, asset inclusion, canonical builder selection, `app.local` exact matching, forbidden lookalike origins, and package-to-source binding.
- Produce a local candidate manifest with source SHA, dirty-state declaration, package identity/publisher/version, console generation, client origin, build command, tool versions, file inventory, unsigned artifact SHA-256, and verification results. A dirty-source artifact must be labeled non-releasable.
- Never load private signing material. Never claim that an unsigned or sideloaded artifact is Store-published.

INVARIANTS:
- The deterministic simulation remains DOM-free and uses `Rng` only. Console detection is presentation/runtime configuration, never simulation state.
- Presentation uses `IWorld`; no direct `Sim` or `ClientWorld` imports are introduced.
- Server authority, auth, CSRF/origin validation, and the 16 KiB WS limit remain intact.
- `app.local` is an exact trusted packaged origin, not a suffix or wildcard rule.
- UWP WebView2 is the sole Xbox shell. Tauri remains Windows Desktop only. The bare probe remains diagnostic only.
- Package identity, version, source SHA, configuration, and artifact hash are independently inspectable.
- Generated files are regenerated by their owner scripts and never hand-edited.
- No secret, certificate private key, PFX, Partner Center credential, or production configuration enters Git, logs, or artifacts.
- Stage explicit paths only.

OUT OF SCOPE:
- Production mutation or deployment, Partner Center edits/submission, console installation, signing, certificate enrollment, ID@Xbox application, Store questionnaire answers, Store screenshots, gameplay controller expansion, unrelated Tauri changes, and broad repository cleanup.

STEP 3 - VALIDATION AND GATED REVIEWERS:
Run at minimum:
- `npx vitest run tests/xbox_env.test.ts tests/offline_mode_gate.test.ts tests/tauri_store_config.test.ts tests/version_sync.test.ts`
- `npx vitest run tests/server/http/cors.test.ts tests/server/http/origin_check.test.ts tests/realm_public_origin.test.ts`
- `npx tsc --noEmit`
- the canonical Xbox package build on a host with the required Microsoft SDK, or record an evidence-backed BLOCKED result with exact missing tooling
- unpack/inspect the candidate and verify identity, version, local web assets, `app.local` navigation, capabilities, no forbidden secrets, and artifact hash
- `npm run security:gate`

Build the reviewer set from the actual diff. Read each selected reviewer instruction file completely before dispatch. Dispatch `privacy-security-review` for server/origin/deploy/secret surfaces, `cross-platform-sync` for `IWorld`, sim, net, wire, or host-parity changes, `migration-safety` only for DDL or persisted JSON changes, `qa-checklist` when deliverables are complete, and the test-coverage auditor for implementation changes. Request COVERAGE: report every issue, including low-severity and uncertain findings, then rank as BLOCKING / SHOULD-FIX / NICE-TO-HAVE / VERDICT. Run release malware review if a distributable artifact or dependency/install surface changed. Fix every BLOCKING and SHOULD-FIX issue before commit.

STEP 4 - COMMIT CADENCE:
- `fix(console): restore canonical runtime seams`
- `build(xbox): make uwp webview2 the release lane`
- `test(xbox): bind package to source evidence`
- `docs(xbox): retire obsolete hosted release guidance`
Use fewer commits when the changes are inseparable. Stage only exact owned files and include generated outputs only when their source changed.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Current and historical Xbox work is reconciled without losing user changes.
- [ ] `src/client_origin.ts` and `src/game/console_generation.ts` have an explicit restored, replaced, or intentionally rejected disposition backed by tests.
- [ ] `shell/CrypticRealm.Shell/` is the only release-capable Xbox shell; the probe is diagnostic and hosted-web packaging is retired or non-release.
- [ ] The packaged page loads from exact `https://app.local` and required API/CORS behavior works without wildcard trust.
- [ ] A reproducible unsigned artifact is bound to exact source, version, identity, configuration, toolchain, and SHA-256 evidence.
- [ ] No production, installed console, signing service, or Partner Center state was mutated.
- [ ] All targeted tests, type checks, package inspection, security checks, and matched reviewers pass with no BLOCKING or SHOULD-FIX findings.

STEP 6 - DOCS, STATE, AND MEMORY:
- Update `docs/xbox-controller-platform/progress.md` and `state.md` with UTC timestamps, start/end SHAs, exact files, recovered commits, commands, artifacts, hashes, verdicts, OPEN items, and the Phase 01 QA handoff.
- Update `qa-checklist.md` only with evidence actually obtained. Preserve previous evidence.
- Record durable memory if that facility is in use, especially source-recovery and shared-worktree decisions.

STEP 7 - FINAL RESPONSE:
Report outcome first, then branch/start/end SHAs, files changed, recovery disposition, canonical build command, artifact identity/hash, validation, reviewer verdicts, untouched external systems, remaining OPEN items, and the exact Phase 01 QA entrypoint.

STOPPING RULES:
- Stop before overwriting or deleting dirty user/concurrent files; use three-way reconciliation or an isolated worktree.
- Stop if source, package identity, or version cannot be bound unambiguously. Missing evidence is not PASS.
- Stop rather than weaken CORS, origin checks, auth, server authority, deterministic sim rules, or secret boundaries.
- Do not mutate `192.168.0.6`, LXC 171, any Xbox, signing service, or Partner Center.
~~~
