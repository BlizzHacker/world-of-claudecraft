# Xbox Controller Platform Whole-Feature QA

## Source and architecture

- [ ] One canonical Cryptic Xbox runtime: UWP WebView2.
- [ ] Tauri Desktop and Xbox manifests/builds cannot substitute for each other.
- [ ] Obsolete hosted-web package commands and documentation are removed or fail closed.
- [ ] Every package records exact source SHA, client artifact hash, version, identity, and compatibility profile.
- [ ] Dirty user work and unrelated repositories were preserved.

## Product-policy and compliance

- [ ] Microsoft/Xbox profile cannot receive wallet, token, cash-reward, crypto-value, or linked-wallet benefit server-side.
- [ ] Web behavior, privacy, terms, commerce, regional availability, and UI agree.
- [ ] IARC answers describe shipped behavior exactly.
- [ ] No functionality is merely hidden to obtain a lower rating.
- [ ] Xbox multiplayer/chat path follows current Microsoft Store and Xbox network policy.
- [ ] No Partner Center action occurred without required confirmation and receipt.

## Controller lifecycle and input parity

- [ ] Controller works from cold launch, landing, auth, realm, character creation/select, world, every window/dialog, chat, disconnect, suspend/resume, and exit.
- [ ] Keyboard, mouse, and touch retain equivalent access.
- [ ] One controller mode state machine and one cursor implementation own behavior.
- [ ] No stuck buttons or movement after focus loss, chat, disconnect, or reconnect.
- [ ] Analog movement and trigger values survive every bridge.
- [ ] Every bindable action dispatches and every one of 23 action slots is reachable.
- [ ] Multiple controllers are assigned deterministically and couch co-op is covered.
- [ ] Haptics degrade safely when unavailable.

## UI, chat, and accessibility

- [ ] A/B/back semantics are consistent and never escape browser history.
- [ ] Every text field has explicit OSK focus/submit/cancel behavior.
- [ ] External auth/community links use approved device-code, QR, or external-device fallback.
- [ ] Every modal and managed window has deterministic focus and visible controller affordances.
- [ ] Long panes scroll; drag-only actions have controller alternatives.
- [ ] Chat channel/recipient/type/submit/cancel works without world movement or camera leakage.
- [ ] Safe areas cover landing, forms, HUD anchors, windows, prompts, toasts, and overlays.
- [ ] 10-foot scale, focus contrast, cursor size/contrast, reduced-dexterity settings, and input-mode announcements are verified.
- [ ] Mobile safe areas and comfortable touch targets remain green.

## Three-host and server-authority invariants

- [ ] Any new gameplay intent extends `IWorld` first and is implemented in Sim and ClientWorld.
- [ ] Offline browser, authoritative server, and headless env remain consistent where the feature touches gameplay.
- [ ] Rewards, entitlements, wallet policy, economy, combat, and multiplayer outcomes remain server-authoritative.
- [ ] No prohibited randomness or clocks enter `src/sim/`.
- [ ] Determinism tests pass for any sim change.

## Network, auth, persistence, and security

- [ ] `https://app.local` auth/CORS works without widening arbitrary origins.
- [ ] Input and product-profile values are validated; client claims do not grant benefits.
- [ ] Existing saves and accounts load unchanged.
- [ ] Any DDL is additive/idempotent and covered by round-trip tests and indexes.
- [ ] No credentials, signing keys, tokens, personal router data, or production environment values entered Git/logs/artifacts.
- [ ] Moderation, parental privileges, and Xbox identity behavior are covered before ID@Xbox release.

## Cartridge and EmulatorJS

- [ ] Every document-ready handshake receives current neutral/active pad state immediately.
- [ ] Standard buttons 0 through 16, four axes, analog triggers, timestamps, and connection events meet the agreed contract.
- [ ] One Menu+View exit contract is visible and suppressed from the emulated game.
- [ ] Explicit default mappings work for representative console families and user remaps persist.
- [ ] Resume, save, load, exit-with-save, exit-without-save, and failure/retry are controller accessible.
- [ ] RomM login/OSK, navigation, emulator launch, reconnect, and return-to-library work on Xbox hardware.
- [ ] Canonical source and LXC deployed-copy drift are reconciled before deployment.

## Performance and hardware

- [ ] Xbox One/One X and Series budgets are selected from trustworthy shell generation data.
- [ ] Memory, GPU, WebGL loss, startup, zone entry, combat, UI, and suspend/resume meet recorded budgets.
- [ ] Controller polling avoids hot-path allocation regressions where practical.
- [ ] Xbox One X hardware matrix passes; unavailable devices remain explicitly OPEN rather than assumed.
- [ ] WACK and package dependency/content validation pass on the final artifact.

## Store assets and truthful progress

- [ ] Ten screenshots are captured directly at 1600x900 from current builds.
- [ ] Each capture records source SHA, scenario, account/character, timestamp, viewport, and script.
- [ ] No debug error, empty progression UI, misleading caption, stretched image, or fabricated scene appears.
- [ ] Progression sequence covers early game, zones, dungeons, real party, real arena, and equipped late-game character.
- [ ] Xbox controller support and 10-foot readability are visible in appropriate assets.
- [ ] Store logos/posters/key art satisfy current Xbox requirements and are licensed/original.

## Release evidence and final gate

- [ ] Full Cryptic CI-equivalent gate passes.
- [ ] Cartridge and EmulatorJS focused suites/package builds pass.
- [ ] Source candidate, unsigned artifact, external signed artifact, Store submission, certification, production promotion, rollback, and health receipts remain distinct.
- [ ] Production identity matches the permanent manifest before any mutation.
- [ ] Backup, rollback ref, isolated stage, smoke, health, and post-deploy error gates are green before promotion.
- [ ] Final report lists every deferred item and unsupported hardware lane.
- [ ] After everything is green, ask the user whether to delete `docs/xbox-controller-platform/`; do not remove it without explicit confirmation.
