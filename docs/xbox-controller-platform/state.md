# Xbox Controller Platform State

## Current checkpoint

- Current phase: Planning packet complete
- Next phase: Phase 1, Canonical Xbox release lane
- Approved: 2026-08-03
- Production mutation: Not authorized
- Partner Center submission/publication: Not authorized without action-time confirmation

## Locked decisions

1. UWP WebView2 under `shell/CrypticRealm.Shell` is the only Cryptic Realm Xbox runtime.
2. Tauri remains a Windows Desktop distribution path.
3. The retired hosted-web Xbox package is not releaseable and must not remain the documented default.
4. Microsoft Store and Xbox builds contain no cash-reward, token-reward, wallet-benefit, or crypto-management behavior.
5. Web wallet behavior may remain only with accurate behavior, privacy, terms, commerce, and region disclosures.
6. Server policy, not hidden UI, enforces product-profile restrictions.
7. ID@Xbox is the strategic path for console multiplayer/chat and main Store discovery.
8. Controller support spans cold launch through exit, not only in-world play.
9. Keyboard, mouse, and touch are first-class and must not regress.
10. Store screenshots are current, truthful gameplay captures with provenance.
11. Store actions, signing, and production deployment remain distinct authority lanes.

## Non-negotiable repository constraints

- Preserve deterministic, DOM-free `src/sim/` logic. Use `Rng`; never add prohibited clocks/randomness.
- Presentation talks only to `IWorld`. Extend `IWorld` first if world behavior truly changes, then keep Sim/ClientWorld/headless parity.
- Server remains authoritative for rewards, entitlements, economy, identity, and multiplayer outcomes.
- Add player strings to English first and every locale; regenerate outputs rather than hand-editing generated files.
- Never enable dev commands in production or commit credentials, signing material, Partner secrets, router secrets, or environment files.
- Shared worktree: explicit paths only; never `git add -A`; do not revert unrelated work.

## Environment identity and safety

- Verified host: `root@192.168.0.6`, hostname `Slimmm` during planning.
- Cryptic production: LXC 171, `/opt/cryptic-realm`.
- Planning-time production HEAD: `98046ac030bc34783da19d79b8c161cd6f77ec13` on dirty `codex/realm-asset-pipeline`.
- Cartridge/RomM: LXC 104 with `/opt/romm-stream` deployment copy, not a canonical Git checkout.
- Legacy `/opt/eastbrook`, `idyllic-games-prod`, and old dev-host profiles are unverified inventory and prohibited automatic targets.
- Before any future production mutation, validate the permanent recovery manifest, backup, rollback ref, stage, CI, health, and post-deploy gates from root `AGENTS.md` and `docs/operations/cryptic-recovery-runbook.md`.

## Key source paths

### Cryptic Realm

- `shell/CrypticRealm.Shell/MainPage.xaml.cs`
- `shell/CrypticRealm.Shell/GamepadBridge.cs`
- `shell/CrypticRealm.Shell/Assets/gamepad-polyfill.js`
- `shell/CrypticRealm.Shell/Package.appxmanifest`
- `.github/workflows/xbox-msix.yml`
- `src/game/gamepad.ts`
- `src/game/gamepad_map.ts`
- `src/game/gamepad_bindings.ts`
- `src/game/gamepad_cursor.ts`
- `src/game/menu_gamepad_nav.ts`
- `src/game/xbox_env.ts`
- `src/game/input.ts`
- `src/ui/focus_manager.ts`
- `src/ui/options_focus_model.ts`
- `src/ui/options_window.ts`
- `src/ui/hud.ts`
- `src/render/gfx.ts`
- `server/web_login_guard.ts`
- `scripts/verify_xbox_pad.mjs`
- `scripts/gamepad_shot.mjs`
- `scripts/deploy_xbox.ps1`
- `docs/xbox-store-release.md`

### Cartridge and EmulatorJS

- `C:/MoveWeight/romm/RommForXbox/shell/RommForXbox.Shell/MainPage.xaml.cs`
- `C:/MoveWeight/romm/RommForXbox/shell/RommForXbox.Shell/GamepadBridge.cs`
- `C:/MoveWeight/romm/RommForXbox/host-bridge.js`
- `C:/MoveWeight/romm/RommForXbox/app.js`
- `C:/MoveWeight/romm/RommStreamServer/server.py`
- `C:/MoveWeight/romm/RommStreamServer/runner_retroarch.py`
- `C:/MoveWeight/romm/RommStreamServer/layouts.js`
- `C:/MoveWeight/romm/RommStreamServer/vpad.py`

## Known source gotchas

- The planning checkout is dirty with user changes and generated outputs.
- `src/render/gfx.ts` references missing client/platform modules on the Xbox branch.
- `https://app.local` login support exists on another branch, not current HEAD.
- Current Xbox workflow consumes a fixed older client artifact.
- Xbox, Tauri Desktop, and hosted-web package versions drift.
- Cryptic production and Cartridge stream deployment are dirty/drifted and must not be treated as clean sources.
- RommStreamServer already contains uncommitted controller work.

## Validation matrix

| Change surface | Required minimum validation |
|---|---|
| Controller pure logic | `npx vitest run tests/gamepad_map.test.ts tests/gamepad_controls.test.ts tests/menu_gamepad_nav.test.ts` plus `npx tsc --noEmit` |
| Controller UI/HUD | Relevant controller/options tests, `npx tsc --noEmit`, localization guard when copy changes, desktop and mobile browser evidence |
| Auth/server profile | Focused auth/policy/server tests, `npx tsc --noEmit`, `npm run build:server`, privacy/security review |
| IWorld/net/wire | Snapshot, env protocol, bandwidth, parity tests plus cross-platform review |
| UWP shell | Native build, package identity/content/dependency checks, JS bridge tests, WACK before release, available Xbox hardware smoke |
| Cartridge shell | Existing `verify_shell.py`, bridge JS tests, native package build, RomM console integration tests |
| EmulatorJS | Representative 2-button, 4-button, 6-button, N64, and PS1 mappings; save/load/exit; reconnect; official mapping labels |
| Assets/screenshots | Exact dimensions/format/budget, provenance manifest, zero page errors, caption-visible-state match |
| Full Cryptic pre-merge | `npm test && npx tsc --noEmit && npm run build:env && npm run build:server && npm run build` |

## Cross-phase additions

- New `IWorld` members: None yet.
- New SimEvents/wire fields: None yet.
- New endpoints: None yet.
- New database tables/columns: None yet.
- New i18n keys: None yet.
- New product-policy fields: None yet.

Each phase must update this section with exact names and files.

## OPEN items

- Exact Partner Center cause of Xbox `License,Details`-only offer.
- Microsoft-approved UWP/MSIX to managed ID@Xbox migration path for this Store ID.
- Exact web wallet behavior and allowed jurisdictions after legal review.
- Series S/X and base Xbox One hardware access.
- External publisher and ID@Xbox credential/authority checkpoints.
- Couch co-op gameplay semantics beyond native four-pad transport and deterministic assignment.
- Partner Center publication and propagation verification as a separate action only after Phase 10 QA is green and fresh user confirmation is obtained.
