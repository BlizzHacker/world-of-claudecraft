# Phase 08: Cartridge and EmulatorJS Controller Reliability

### Starter Prompt

```text
This is Phase 08 of the Xbox Controller Platform feature: Cartridge and EmulatorJS Controller Reliability.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add `ultracode` when executing the representative EmulatorJS core matrix with
an adversarial-verify Workflow.

Goal: Make Cartridge reliably carry Xbox controller state through its UWP shell, navigation,
RommStreamServer, and representative EmulatorJS cores, with explicit mappings and a controller-complete overlay.

STEP 0 - PRE-FLIGHT:
- Work across `C:\MoveWeight\romm\RommForXbox` and `C:\MoveWeight\romm\RommStreamServer` only after
  recording each repository's branch, HEAD, remotes, and `git status --short --branch`.
- RommStreamServer already contains uncommitted controller work. Treat every dirty or untracked file as
  user-owned. Do not reset, clean, stash, overwrite, or reformat it. Stop if ownership cannot be separated.
- Record the Cryptic Realm planning packet status but do not modify Cryptic source in this phase.
- Scan memory, if used, for Cartridge, EmulatorJS, WebView navigation, controller bridge, exit chord,
  representative cores, shared-worktree commits, and production target cautions.
- Confirm Phase 07 QA is green. This phase does not deploy.

STEP 1 - LOAD CONTEXT:
Spawn two Explore agents in parallel, one per repository.

RommForXbox Explore reads and summarizes:
- `C:\MoveWeight\romm\RommForXbox\gamepad.js`, `host-bridge.js`, `app.js`, `romm.js`, `config.js`, and `index.html`
- `C:\MoveWeight\romm\RommForXbox\osk.js`, `style.css`, and `README.md`
- `C:\MoveWeight\romm\RommForXbox\shell\RommForXbox.Shell\GamepadBridge.cs`
- `MainPage.xaml.cs`, `MainPage.xaml`, `App.xaml.cs`, `Package.appxmanifest`, and the shell project
- `tests\verify_shell.py`, `tests\validate_cores.js`, `shell\tests\RoutedUrlTests.cs`
- Repository instruction files found by `rg --files -g AGENTS.md -g CLAUDE.md`

RommStreamServer Explore reads and summarizes:
- `C:\MoveWeight\romm\RommStreamServer\server.py`, `remote.html`, `phone.html`, `layouts.js`, and `vpad.py`
- `docs\analog-input.md`, `README.md`, and the existing Romm for Xbox design and plan docs
- `tests\ejs_matrix.py`, `tests\probe_core.py`, `tests\test_core.py`, and `tests\verify_stream.py`
- Repository instruction files found by `rg --files -g AGENTS.md -g CLAUDE.md`
Each agent must return current message schemas, readiness/navigation lifecycle, dirty-file ownership,
mapping order, exit handling, overlay capabilities, core matrix, test commands, and gaps.

Also spawn a web-research agent for current primary-source EmulatorJS documentation and source on
`EJS_defaultControls`, standard Gamepad mapping, player indexing, analog triggers, save/load APIs,
pause/resume, core differences, and lifecycle events. Return citations and mark unverifiable behavior OPEN.

STEP 2 - CHOOSE ORCHESTRATION + EXECUTE:
Request explicit parallel fan-out only where file ownership is disjoint. Never allow agents to edit the
same dirty RommStreamServer files concurrently. Give each only its repository Explore summary.

Cartridge shell agent deliverables:
- Implement an explicit ready handshake after every page navigation, reload, WebView recreation, and emulator
  start. On ready, force-resend the complete current controller state even if no physical value changed.
- Normalize all pads with analog trigger precision and the standard index 16 placeholder. Clear stale state on
  disconnect, visibility loss, navigation, suspend, and resume; do not generate duplicate edges.
- Detect one documented Menu+View exit chord in the shell, suppress both constituent buttons from the emulated
  core while held, debounce it, and route it to the overlay. No core may receive the chord.

EmulatorJS integration agent deliverables:
- Generate and supply an explicit `EJS_defaultControls` mapping for every supported player rather than relying
  on browser or core defaults. Keep mapping order stable across representative cores and controllers.
- Add a controller-operable overlay with Resume, Save, Load, and Exit; clear focus ownership and controller state
  predictably when entering or leaving it. Protect save/load from repeated presses and partial failures.
- Keep server validation authoritative for session and save ownership. Do not trust client-selected paths or IDs.

Test and compatibility agent deliverables:
- Add deterministic tests for ready/force-resend, navigation, reconnect, suspend/resume, mapping shape,
  trigger values, index 16, exit-chord suppression/debounce, overlay focus, and save/load failure states.
- Run representative cores from distinct families already available in `tests/ejs_matrix.py`, documenting
  any core-specific remaps or unsupported features rather than hiding failures.
- Update only source docs needed to explain controls and known limitations. Do not alter Store screenshots.

INVARIANTS THIS PHASE MUST KEEP:
- Preserve all pre-existing dirty RommStreamServer work and document provenance for every edited hunk.
- One physical event yields at most one shell action or core input. The exit chord never reaches the core.
- Analog values stay analog end to end; button arrays use stable standard indices including placeholder 16.
- Saves and sessions remain server-authorized, path-safe, tenant-safe, and backward-compatible.
- No production host, LXC, service, package submission, or Store listing is changed in this phase.

Out of scope:
- Deploying to `192.168.0.6`, changing LXC state, Store publishing, new emulator cores, ROM acquisition,
  ROM redistribution, DRM circumvention, Cryptic Realm UI changes, or redesigning existing Romm screenshots.
- Broad cleanup or formatting of dirty server files unrelated to controller reliability.

STEP 3 - VALIDATION + MULTI-AGENT REVIEW:
- Run repository-native tests discovered in Step 1, including RommForXbox shell verification, core validation,
  routed URL tests, and RommStreamServer Pytest and EmulatorJS matrix tests.
- Exercise cold start, navigation, reload, emulator start, controller pre-connected before ready, disconnect,
  reconnect, suspend/resume, analog sweeps, two pads, exit chord, overlay Resume/Save/Load/Exit, and failure paths.
- Use only legally available test content and record core/version/controller/browser details.
- Dispatch `privacy-security-review` for server/session/save/auth/deploy-file diffs. Dispatch `qa-checklist` when
  complete. Use `cross-platform-sync` and `migration-safety` only if their Cryptic Realm surfaces somehow entered
  the diff, which should normally be never. Ask for COVERAGE and clear all BLOCKING issues before commits.

STEP 4 - COMMIT CADENCE:
Commit separately in each repository with explicit paths, never `git add -A`, and never absorb pre-existing work.
Suggested commits:
- RommForXbox: `fix(input): resend controller state after navigation`
- RommForXbox: `feat(input): add safe emulator exit overlay`
- RommStreamServer: `fix(emulator): define stable xbox controller mappings`
- RommStreamServer: `test(emulator): cover controller lifecycle across cores`
Do not push or deploy.

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] Every navigation and emulator launch performs a ready handshake and force-resends current pad state.
- [ ] Disconnect, reconnect, visibility, suspend, resume, and WebView recreation cannot leave stuck inputs.
- [ ] Triggers retain analog precision and standard index 16 is present without shifting later buttons.
- [ ] Each supported player has explicit `EJS_defaultControls`; representative cores pass the recorded matrix.
- [ ] Menu+View opens the overlay exactly once and neither button reaches the emulated core during the chord.
- [ ] Resume, Save, Load, and Exit are controller-complete and handle cancellation and failures safely.
- [ ] Existing dirty RommStreamServer work is preserved and no deployment or Store mutation occurred.

STEP 6 - DOC UPDATES + MEMORY:
- Update Cryptic Realm `docs/xbox-controller-platform/progress.md` and `state.md` with both repository commits,
  mappings, handshake schema, core matrix, tests, dirty-work provenance, and OPEN items.
- Update relevant Romm source documentation only when it ships with the same logical change.
- Record surprising EmulatorJS or shared-worktree rules in memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report status per repository, exact files and commits, preserved dirty-work statement, handshake and mapping
contracts, representative core results, security review, validation, OPEN items, no-deploy confirmation,
and a one-line handoff to Phase 08 QA.

STOPPING RULES:
- Stop if any edit would overwrite, stage, or ambiguously absorb pre-existing RommStreamServer work.
- Stop if an exit-chord constituent can reach a core or controller state can remain stuck.
- Stop and ask before deployment, production SSH mutation, package publishing, ROM acquisition, or secret use.
```
