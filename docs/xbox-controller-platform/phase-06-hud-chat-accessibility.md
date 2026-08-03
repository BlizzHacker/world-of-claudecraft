# Phase 06: HUD, Chat, Accessibility, and 10-Foot UX

### Starter Prompt

```text
This is Phase 06 of the Xbox Controller Platform feature: HUD, Chat, Accessibility, and 10-Foot UX.

Model: Opus 4.8, max effort, 1m context variant where the file load demands it.
Harness: Codex.
ULTRACODE: add the keyword `ultracode` if the all-window accessibility audit or all-locale
copy sweep is large enough to require a Workflow with adversarial verification.

Goal: Make every Cryptic Realm shell, HUD, dialog, scrolling surface, and chat flow usable
from an Xbox controller at television distance while preserving keyboard, mouse, and mobile behavior.

STEP 0 - PRE-FLIGHT:
- Record `git status --short --branch` and the phase-start commit. Do not clean, revert, or
  stage unrelated user or concurrent work. If dirty paths overlap this phase, stop and ask.
- Memory scan, if Codex memory is in use: read the `MEMORY.md` index and entries about gamepad
  navigation, chat focus, modal ownership, mobile safe areas, and shared-worktree commit care.
- Confirm Phase 05 QA is green in `docs/xbox-controller-platform/progress.md`.

STEP 1 - LOAD CONTEXT (do not read large planning or HUD files in the main context):
Spawn an Explore agent to read and summarize:
- `docs/xbox-controller-platform/state.md`, `progress.md`, and this phase file
- `src/main.ts`
- `src/game/gamepad.ts`, `src/game/gamepad_cursor.ts`, `src/game/gamepad_bindings.ts`
- `src/game/gamepad_map.ts`, `src/game/menu_gamepad_nav.ts`, `src/game/input.ts`
- `src/game/input_activity.ts`, `src/game/mobile_controls.ts`, `src/game/mobile_hud_layout_applier.ts`
- `src/ui/hud.ts`, `src/ui/chat_window.ts`, `src/ui/chat_mobile_panel.ts`
- `src/ui/chat_mobile_overlay.ts`, `src/ui/chat_command_menu.ts`, `src/ui/cryptic/chat_frame.ts`
- `src/ui/mobile_hud_layout.ts`, `src/styles/hud.css`, `src/styles/hud.mobile.css`
- Existing gamepad, chat, window, and mobile tests under `tests/`
- `AGENTS.md`, `src/CLAUDE.md`, `src/game/CLAUDE.md`, `src/ui/CLAUDE.md`,
  `src/styles/CLAUDE.md`, and `tests/CLAUDE.md`
Return a window and dialog inventory, current focus/cursor ownership rules, all scroll and drag-only
interactions, chat focus transitions, mobile coupling, relevant tests, and the smallest safe seams.

STEP 2 - CHOOSE ORCHESTRATION + EXECUTE:
Request explicit parallel fan-out after Explore. Prefer three vertical-slice agents with disjoint
ownership. Give them only the Explore summary. Use a worktree only if overlapping edits cannot be avoided.

HUD and dialog navigation agent deliverables:
- Establish deterministic focus order, focus restoration, cancel/back behavior, nested-modal ownership,
  wrap policy, and visible focus for every landing, account, realm, character, HUD, menu, dialog, tooltip,
  and error surface reachable in normal play.
- Add controller scroll actions and button alternatives for every wheel-only or drag-only operation,
  including lists, tabs, sliders, maps, inventory movement, window movement, and resize affordances.
- Preserve pointer semantics and expose an accessible virtual cursor only when semantic focus cannot work.

Chat and text-entry agent deliverables:
- Add an explicit chat input mode in which movement, camera, combat, and action bindings cannot leak.
- Support controller channel selection, history, send, cancel, whisper targeting, quick-chat phrases,
  and OSK invocation without submitting stale or duplicate text.
- Restore the prior gameplay or modal focus after OSK close, suspend, disconnect, or cancellation.

10-foot, accessibility, and mobile agent deliverables:
- Make input mode visible and stable, with legible focus, button hints, text scale, contrast, reduced-motion
  behavior, comfortable television spacing, overscan-safe regions, and no hover-only information.
- Respect CSS safe-area insets and every supported mobile layout. Controller improvements must not hide,
  resize, reorder, or disable touch controls.
- Add focused unit tests and browser scripts for controller-only navigation, chat isolation, scrolling,
  drag alternatives, focus restoration, mobile safe areas, and input-mode transitions.

INVARIANTS THIS PHASE MUST KEEP:
- Presentation talks only to `IWorld`; no UI path reaches into `Sim` or `ClientWorld` directly.
- Server authority and deterministic sim behavior are unchanged. No `Math.random`, `Date.now`, or
  `performance.now` enters `src/sim/`.
- Every new player-visible string is a `t()` key present in every locale. Never hand-edit generated i18n.
- A single physical action produces at most one semantic command, even when focus and virtual cursor overlap.
- Keyboard, mouse, touch, screen-size adaptation, and mobile safe areas remain first-class.

Out of scope:
- Native Xbox hardware polling, rumble, suspend/resume bridge work, Store metadata, EmulatorJS, and captures.
- New gameplay mechanics, balance changes, persistence changes, or wire-protocol changes.
- Deploying, publishing, or editing production.

STEP 3 - VALIDATION + MULTI-AGENT REVIEW:
- Run `npx tsc --noEmit`.
- Run the affected gamepad, menu, input, chat, window, and mobile Vitest suites, including
  `tests/gamepad.test.ts`, `tests/gamepad_controls.test.ts`, `tests/menu_gamepad_nav.test.ts`,
  `tests/chat_keyboard_dismiss.test.ts`, `tests/chat_mobile_panel.test.ts`,
  `tests/mobile_window_coverage.test.ts`, and `tests/localization_fixes.test.ts`.
- With the local client running, run `node scripts/gamepad_shot.mjs`,
  `node scripts/mobile_visual.mjs`, and the affected mobile chat and safe-area scripts.
  Save evidence for controller-only completion and phone viewport non-regression.
- Inspect the diff, then dispatch only matching gated reviewers. A pure UI/game/style diff does not
  trigger privacy-security, migration-safety, or cross-platform-sync. Dispatch `qa-checklist` when
  the deliverable set is complete. If another surface entered the diff, follow the dispatch matrix in
  `state.md`. Ask for COVERAGE, including low-severity and uncertain findings. No commit may retain BLOCKING issues.

STEP 4 - COMMIT CADENCE:
Use explicit paths, never `git add -A`, with 2 to 4 focused commits such as:
- `feat(input): complete controller dialog navigation`
- `feat(chat): add isolated controller text entry`
- `feat(ui): add accessible ten foot controller affordances`
- `test(input): cover controller hud and mobile parity`

STEP 5 - ACCEPTANCE CRITERIA:
- [ ] A controller alone can reach, operate, and exit every normal shell, HUD, menu, and dialog surface.
- [ ] Every scroll-only and drag-only operation has a documented, visible controller alternative.
- [ ] Chat and OSK modes suppress movement, camera, combat, and action leakage, then restore focus correctly.
- [ ] Quick chat, channels, whispers, history, send, and cancel work without duplicate commands.
- [ ] Focus, cursor, input-mode hints, text, contrast, and reduced motion are usable at television distance.
- [ ] Keyboard, mouse, and mobile behavior remains green, including safe areas and touch controls.
- [ ] All new copy is localized in every locale and all targeted automated and visual checks pass.

STEP 6 - DOC UPDATES + MEMORY:
- Update `docs/xbox-controller-platform/progress.md` with Phase 06 status and evidence.
- Update `docs/xbox-controller-platform/state.md` with focus contracts, actions, input modes,
  i18n keys, tests, and any deferrals. Record surprising rules in memory if used.

STEP 7 - FINAL RESPONSE FORMAT:
Report phase status, files touched, controller-only flows proven, mobile evidence, validation results,
review verdicts, deferred items, and a one-line handoff to Phase 06 QA.

STOPPING RULES:
- Stop if an input-mode transition can emit gameplay intent while chat or OSK owns focus.
- Stop and ask before changing `IWorld`, the wire protocol, persistence, or gameplay semantics.
- Stop if a mobile or keyboard/mouse regression cannot be resolved inside this phase.
```
