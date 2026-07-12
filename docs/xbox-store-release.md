# Xbox release pack

Cryptic Realm ships to Xbox as a **hosted web app MSIX** whose start page is
the live game at `https://crypticrealm.com/`. The desktop Microsoft Store
package (`docs/microsoft-store-release.md`, Tauri win32) cannot run on a
console; this package targets the `Windows.Xbox` device family and uploads to
the **same** Partner Center product, so one Store listing serves both.

## Why the game is pad-playable

- `src/game/gamepad.ts` + `gamepad_map.ts` + `gamepad_bindings.ts`: movement,
  camera, abilities, targeting, jump, autorun; enabled by default
  (`gamepadEnabled` setting), Xbox/PS/generic glyph detection, rumble.
- `src/game/gamepad_cursor.ts`: controller-driven virtual mouse. Any HTML UI
  (quests, vendors, bags, chat, menus) is clickable with the pad; cursor mode
  auto-arms when a blocking window opens.
- `src/game/xbox_env.ts`: console shim. Xbox Edge hands the physical pad to
  the page only in fullscreen, so the first click or keypress (Edge's
  pad-as-mouse click counts) requests fullscreen and re-arms if it drops.
- Text entry (login, chat): the console's system on-screen keyboard appears
  for focused inputs; the virtual cursor focuses them.

## Build

```powershell
npm run xbox:build:msix
```

Output: `release/xbox-store/CrypticRealm_<version>.1_neutral.msix`.
Version revision `.1` distinguishes it from the desktop package's `.0` inside
one submission. Identity (`MOVEWEIGHT.CrypticRealm` / MOVE WEIGHT publisher)
must stay byte-identical with `scripts/build_tauri_msix.mjs`.

Override the start page for staging tests:
`CR_XBOX_START_PAGE=https://beta.crypticrealm.com/ npm run xbox:build:msix`.

## Test on a real console (before Store)

1. Enable Dev Mode on the Xbox (Dev Mode activation app, one-time $19 dev
   account — the same account used for Partner Center).
2. Open Device Portal (`https://<xbox-ip>:11443`) → Add → upload the `.msix`.
3. Launch. Expected: game loads, first A press flips fullscreen, pad drives
   movement/camera/UI; hold the cursor over inputs to summon the OSK.

Retail consoles get it from the Store after certification — no Dev Mode.
Until then, retail players can already play in **Edge** at
`https://crypticrealm.com/` (same gamepad stack; fullscreen prompt applies).

## Submission notes

- Upload into the existing Cryptic Realm product next to the desktop MSIX.
  In Availability, tick the Xbox device families (One + Series X|S).
- All four submission holds in `docs/microsoft-store-release.md`
  (Company account for wallet linking, wallet-benefit disclosure conflict,
  commerce disclosure, IARC from shipped content) apply identically here —
  resolve them once for the product.
- Hosted web apps are certified against the live site: keep
  `crypticrealm.com` privacy/terms/support URLs green and do not ship a
  breaking site change during certification week.
