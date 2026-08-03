# Approved Vision and Research

## Approved product vision

The user approved these decisions on 2026-08-03:

- The Microsoft Store and Xbox build of Cryptic Realm ships without cash-reward, token-reward, wallet-benefit, or crypto-management behavior.
- The web edition may retain wallet features only when behavior, legal terms, privacy disclosures, Store copy, and regional availability describe them accurately.
- Cryptic Realm pursues ID@Xbox because its console experience includes synchronous multiplayer and player communication and because main Xbox Store discovery is a strategic goal.
- `shell/CrypticRealm.Shell`, the UWP WebView2 shell, is the sole Cryptic Realm Xbox runtime.
- The retired hosted-web Xbox package and Tauri desktop package are not interchangeable with the Xbox runtime.
- Store screenshots must be real, current gameplay captures. No generated or staged marketing scene may be represented as gameplay.
- Partner Center submission, publication, IARC answers, and production deployment remain explicit external checkpoints, not implementation side effects.

## Current evidence

### Cryptic Realm Store state

- Store ID: `9P34BZH26X6Z`.
- Correct package identity: `MOVEWEIGHT.CrypticRealm` and PFN `MOVEWEIGHT.CrypticRealm_cc8fbgj629aap`.
- Submission 3 contains an Xbox-capable `0.26.0.0` UWP WebView2 package.
- The public catalog contains the Xbox package but the Xbox availability exposes only `License` and `Details`. Desktop exposes browse and acquisition actions.
- The public product page reports `allowedPlatforms: ["Windows.Desktop"]` and `Available on: PC`.
- The current age result is ESRB AO / PEGI 18 with `Cash Rewards`, `restrictMetadata`, and `restrictPurchase`.
- The product is `XboxLiveTier: Open`, the Xbox Creators Program tier.

This proves the missing Xbox search result is not a package-name or PFN defect. The immediate problem is a suppressed Xbox offer plus a restrictive age-rating result. The strategic placement problem is the Creators Program versus ID@Xbox boundary.

### Cryptic Realm code state

- The current branch is `feature/xbox-webview2-shell` at `00c80c782` at planning time.
- The worktree already contains unrelated modified generated files and untracked Store work. Preserve all of it.
- `src/render/gfx.ts` imports missing `src/client_origin.ts` and `src/game/console_generation.ts` on this branch.
- The `https://app.local` login/CORS fix exists on another branch and is absent from the current branch.
- The UWP workflow downloads a fixed older client artifact and is not triggered by all client/server changes that affect Xbox.
- The old `scripts/build_xbox_msix.mjs` path describes a hosted EdgeHTML package that renders incorrectly on Xbox.
- Existing pure controller mapping, options navigation, and focused tests are strong. Controller ownership begins too late, after world entry.

### Cartridge and EmulatorJS state

- Canonical Xbox source: `C:/MoveWeight/romm/RommForXbox`, clean `main` at `4b603b65652afd583752d91ad4a65cbdd309d251` during planning.
- Companion server: `C:/MoveWeight/romm/RommStreamServer`, with pre-existing modified `retroarch.cfg`, modified `vpad.py`, and untracked controller test scripts. Preserve them.
- Production LXC 104 is a deployed copy rather than a Git checkout, and its browser assets drift from canonical source.
- The shell-to-page gamepad bridge uses standard Xbox ordering but only one controller, boolean trigger values, no index 16 placeholder, no haptics, and incomplete document lifecycle handling.
- A newly navigated document can miss the current controller state until input changes.
- The active RomM console and legacy Cartridge fallback disagree on the Menu+View exit gesture.
- EmulatorJS defaults are not explicit for every server configuration.

### Production safety state

- Current Cryptic production evidence is Proxmox `192.168.0.6`, LXC 171, repository `/opt/cryptic-realm`.
- LXC 171 was on `98046ac030bc34783da19d79b8c161cd6f77ec13` and had a dirty `codex/realm-asset-pipeline` checkout during planning.
- No production mutation is authorized by this packet.
- The old `/opt/eastbrook`, `idyllic-games-prod`, and legacy dev-host inventory must never be targeted automatically.

## Existing systems to reuse

### Cryptic Realm

- `src/game/gamepad_map.ts`: W3C standard mapping, radial deadzone, glyph families, rising edges.
- `src/game/gamepad_bindings.ts`: persistent bindings.
- `src/game/gamepad.ts`: world input, menu intent, cursor mode, rumble hooks.
- `src/game/menu_gamepad_nav.ts`: deterministic controller verbs.
- `src/ui/focus_manager.ts` and `src/ui/options_focus_model.ts`: focus and controller intent models.
- `src/ui/options_window.ts`: polished controller settings and duplicate warnings.
- `shell/CrypticRealm.Shell/GamepadBridge.cs`: native `Windows.Gaming.Input` bridge.
- `shell/CrypticRealm.Shell/Assets/gamepad-polyfill.js`: WebView2 `navigator.getGamepads()` surface.
- `window.__game`, focused Vitest suites, and existing Puppeteer scripts for deterministic local evidence.

No new `IWorld` method is assumed. Controller behavior should stay in input/UI/platform seams unless a later phase demonstrates a real world-state requirement. Any new gameplay intent crossing the world seam must extend `IWorld` first and remain identical offline, online, and headless where relevant.

### Cartridge

- `RommForXbox` UWP WebView2 shell and `host-bridge.js`.
- RomM 4.9.2 `/console` navigation, save-and-exit flow, and EmulatorJS integration.
- `RommStreamServer` abstract RetroPad input route and per-console layouts.
- EmulatorJS documented `EJS_defaultControls`, `EJS_loadStateURL`, callbacks, and fullscreen options.

## Work that is genuinely new

- One app-lifetime controller service covering pre-world and in-world surfaces.
- A single cursor/action-dispatch implementation with explicit modes.
- Controller-first auth, OSK, realm, and character flows.
- Analog movement and complete access to all 23 action slots.
- Chat focus/submit/cancel semantics with no movement leakage.
- Controller scrolling, non-drag alternatives, global safe areas, and a 10-foot accessibility preset.
- Multi-controller native bridges, analog triggers, haptics, reconnect, suspend/resume, and console-generation budgets.
- A server-authoritative product policy profile that prevents Microsoft builds from receiving cash/crypto benefits.
- Cartridge page-ready handshakes, explicit EmulatorJS defaults, one exit contract, and controller-accessible save/load.
- Immutable package/source manifests and real hardware evidence.

## Primary-source research

- Microsoft visibility and discoverability: https://learn.microsoft.com/en-us/xbox/game-publishing/concepts/availability/visibility
- Microsoft hidden/direct-link release behavior: https://learn.microsoft.com/en-us/xbox/game-publishing/how-to/how-to-hiddenrelease
- Creators Program and ID@Xbox placement: https://learn.microsoft.com/en-us/windows/uwp/gaming/game-development-platform-guide
- Concept approval: https://learn.microsoft.com/en-us/windows/uwp/gaming/concept-approval
- Current Microsoft Store policies: https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- Xbox creator onboarding: https://learn.microsoft.com/en-us/gaming/game-publishing/onboarding/overview
- Xbox package overview: https://learn.microsoft.com/en-us/gaming/game-publishing/concepts/packages-overview
- Xbox age ratings: https://learn.microsoft.com/en-us/xbox/game-publishing/tutorial-xbox-managed/how-to-set-age-ratings
- EmulatorJS control mapping: https://emulatorjs.org/docs4devs/control-mapping/
- EmulatorJS options: https://emulatorjs.org/docs/options/
- W3C Gamepad standard ordering: https://www.w3.org/TR/gamepad/#remapping
- WebView2 Gamepad API tracking issue: https://github.com/MicrosoftEdge/WebView2Feedback/issues/4366

## OPEN items

- Partner Center must reveal which exact visibility, release, audience, stop-acquisition, or rating rule produced the Xbox `License,Details`-only availability.
- An assigned Xbox contact must confirm migration of this existing UWP/MSIX Store ID to the current managed ID@Xbox GDK/XVC path.
- The exact web-only wallet feature inventory and jurisdictions must be reconciled against server behavior, privacy, terms, and commerce disclosures.
- Access to Xbox One X exists. Access to Xbox One/S, Series S, and Series X for the full hardware matrix remains OPEN.
- The owner must perform or explicitly authorize every final Partner Center submission/publication action and any credentialed ID@Xbox enrollment step.
- Production recovery manifest identity and a clean candidate must be confirmed before any deployment. This packet does not authorize deployment.
