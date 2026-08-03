# Phase 07: Native Xbox Bridge and Hardware Lifecycle

### Starter Prompt

```text
This is Phase 07 of the Xbox Controller Platform feature: Native Xbox Bridge and Hardware Lifecycle.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` if the device, console-generation, and lifecycle matrix warrants
a Workflow with adversarial verification.

Goal: Make the UWP WebView2 shell deliver standards-shaped, lossless Xbox controller input
and reliable hardware lifecycle behavior, including multi-pad, analog triggers, rumble,
reconnect, suspend, resume, and controller-safe device-code or QR linking.

STEP 0 - PRE-FLIGHT:
- Record `git status --short --branch` and the phase-start commit. Preserve all unrelated user and
  concurrent changes. Stop if dirty files overlap `shell/`, Xbox input modules, or their tests.
- Scan memory, if used, for WebView2, Windows.Gaming.Input, UWP lifecycle, Gamepad API compatibility,
  package capabilities, device-code auth, and shared-worktree commit care.
- Confirm Phase 06 QA is green.

STEP 1 - LOAD CONTEXT:
Spawn an Explore agent to read and summarize:
- `docs/xbox-controller-platform/state.md`, `progress.md`, and this phase file
- `shell/CrypticRealm.Shell/GamepadBridge.cs`, `MainPage.xaml.cs`, `MainPage.xaml`
- `shell/CrypticRealm.Shell/App.xaml.cs`, `Package.appxmanifest`, and `CrypticRealm.Shell.csproj`
- `shell/CrypticRealm.Shell/Assets/gamepad-polyfill.js`
- `src/main.ts`, `src/game/xbox_env.ts`, `src/game/gamepad.ts`, `src/game/gamepad_map.ts`
- `src/game/gamepad_bindings.ts`, `src/game/gamepad_cursor.ts`, `src/game/input_activity.ts`
- `scripts/build_xbox_msix.mjs`, `scripts/deploy_xbox.ps1`, `scripts/verify_xbox_pad.mjs`
- `tests/gamepad.test.ts`, `tests/gamepad_map.test.ts`, `tests/gamepad_controls.test.ts`,
  `tests/xbox_env.test.ts`, and any shell tests found by the agent
- `AGENTS.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `scripts/CLAUDE.md`, and `tests/CLAUDE.md`
Return the native-to-JavaScript message contract, current standard mapping, lifecycle hooks,
capabilities, auth-linking seams, testability constraints, console-generation assumptions,
and every discrepancy between browser and native pad state.

In parallel, spawn a web-research agent for current primary-source Microsoft documentation on
Windows.Gaming.Input, UWP Xbox gamepad support, WebView2 script messaging, vibration, app suspend/resume,
Xbox One and Xbox Series compatibility, device-code authentication, QR URI launch, and Store capability rules.
Return citations, API/version constraints, and mark unverifiable claims OPEN rather than guessing.

STEP 2 - CHOOSE ORCHESTRATION + EXECUTE:
Request explicit fan-out. Use three agents with non-overlapping ownership and only the Explore summary.

Native bridge agent deliverables:
- Normalize up to four pads into a standards-shaped Gamepad API snapshot with stable indices,
  connection timestamps, all axes, digital buttons, analog trigger values, and the standard
  index 16 placeholder so later buttons never shift.
- Make bridge readiness explicit and idempotent. Deliver state only after page readiness, survive
  navigation/reload, avoid duplicate event handlers, and preserve one physical press per semantic edge.

Lifecycle and output agent deliverables:
- Handle controller add/remove, reconnect, user reassignment, app suspend, resume, visibility changes,
  WebView recreation, and stale-state clearing without stuck movement or buttons.
- Add bounded rumble with capability checks, cancellation, per-pad routing, and silent degradation
  when vibration is unavailable. Do not allow web content to sustain unbounded vibration.
- Record and support the tested Xbox One and Xbox Series console-generation matrix without assuming parity.

Linking and test agent deliverables:
- Integrate the Phase 04 device-code/QR contract with native lifecycle and presentation only: resume,
  suspension, WebView recreation, controller focus, expiry, retry, cancel, and keyboard-free continuation.
  Do not add a second server flow or redefine Phase 04 auth states. Keep tokens and secrets out of URLs,
  logs, and screenshots.
- Add C# and TypeScript tests for mapping, placeholder index 16, analog precision, multi-pad identity,
  disconnect clearing, suspend/resume, navigation readiness, rumble bounds, and linking state.
- Extend the hardware verification script to produce sanitized, reproducible evidence.

INVARIANTS THIS PHASE MUST KEEP:
- The web layer consumes one canonical gamepad contract. Native and browser fallback paths must not double-report.
- Input timestamps and lifecycle state are presentation concerns and never enter deterministic sim logic.
- No secret, access token, refresh token, or device-code credential appears in logs, URLs, screenshots, or telemetry.
- UWP WebView2 remains the sole console package architecture. Tauri remains desktop-only.
- Every new player string is localized in every locale; generated files are regenerated, never hand-edited.

Out of scope:
- Cartridge or EmulatorJS changes, Store publishing, ID@Xbox integration, gameplay systems, and production deploys.
- Xbox network identity implementation beyond a documented linking seam; do not invent unavailable SDK access.
- Supporting more than four local pads. This phase proves multi-pad transport and deterministic assignment
  only; couch co-op gameplay remains an explicit post-packet OPEN follow-up.

STEP 3 - VALIDATION + MULTI-AGENT REVIEW:
- Run `npx tsc --noEmit` and the affected gamepad and Xbox environment Vitest suites.
- Build the UWP shell in the documented supported environment and run its C# tests. Build the MSIX without
  signing secrets in logs, then run `node scripts/verify_xbox_pad.mjs` on each available hardware generation.
- Test cold launch, reload, navigation, sign-in linking, pad add/remove, four-pad ordering, trigger sweeps,
  index 16 shape, rumble start/stop, suspend/resume, and WebView recreation. Record unavailable hardware as OPEN.
- Dispatch `privacy-security-review` because native bridge/auth and package surfaces may be touched.
  Dispatch `cross-platform-sync` only if `IWorld`, sim, ClientWorld, wire, matcher, or RL surfaces entered the diff.
  Dispatch `migration-safety` only for actual persistence changes. Dispatch `qa-checklist` on completion.
  Ask for COVERAGE and do not commit with BLOCKING findings.

STEP 4 - COMMIT CADENCE:
Use explicit paths, never `git add -A`, with focused commits such as:
- `feat(xbox): normalize native multi-pad input`
- `feat(xbox): handle controller and app lifecycle`
- `feat(xbox): add bounded rumble and secure linking`
- `test(xbox): cover native bridge lifecycle`

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Browser fallback and native bridge expose the same stable standard mapping without duplicate input.
- [ ] Analog triggers retain full values and standard button index 16 exists as a placeholder when unpressed.
- [ ] Up to four pads keep stable identities through connect, disconnect, reload, suspend, and resume.
- [ ] No stale state causes stuck movement, camera, combat, cursor, or menu actions.
- [ ] Rumble is capability-checked, bounded, cancelable, correctly routed, and safe on unsupported devices.
- [ ] Device-code or QR linking is controller-complete and leaks no credentials.
- [ ] Xbox One and Xbox Series results are recorded separately, with unsupported or untested cases marked OPEN.
- [ ] UWP shell build, relevant tests, and available hardware checks pass.

STEP 6 - DOC UPDATES + MEMORY:
- Update `progress.md` and `state.md` with the bridge schema, lifecycle state machine, rumble contract,
  linking seam, package requirements, hardware results, tests, and OPEN SDK or device items.
- Record surprising native platform rules in memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files touched, bridge and lifecycle contracts, platform research citations,
hardware matrix, build/test results, reviewer verdicts, OPEN items, and a one-line Phase 07 QA handoff.

STOPPING RULES:
- Stop if official platform behavior is unverifiable or would require guessing a capability or API contract.
- Stop before requesting, exposing, or committing credentials, signing keys, Partner Center secrets, or tokens.
- Stop and ask before changing package identity, Store association, authentication authority, or publishing.
```
