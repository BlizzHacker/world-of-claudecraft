# Original Cryptic Realm + ArcForge on CrypticRealm.com — Design

**Date:** 2026-06-28
**Repo:** `cryptic-realm` (deploy target for CrypticRealm.com)
**Working branch:** `codex/cryptic-v016-catchup` (current) → ships via `codex/cryptic-token-runtime` → release branches

## Goal

Make CrypticRealm.com offer **two ways to play**:

1. **ClaudeCraft** — the existing world-of-claudecraft-based realm system (unchanged).
2. **Classic** — the *Original* Cryptic Realm, the 13.9k-line canvas game from the
   `moveweight-ui` repo (`src/CrypticRealmGame.js`), embedded as a lazy-loaded React island.

Plus: restore and extend the in-game **ArcForge** builder so it works for the ClaudeCraft realms.

## Source-of-truth facts (verified 2026-06-28)

- Original game: `moveweight-ui/src/CrypticRealmGame.js` (13,925 lines) + ~15 sibling modules
  (`crypticD2Engine.js`, `crypticD2Systems.js`, `crypticDatabase.js`, `crypticAssets.js`,
  `crypticModelAssets.js`, `assetManifest.js`, `crypticD2CoreData.js`, `FishingGame.js`,
  `CardGame.js`, `DiceGame.js`, `TargetGame.js`, `DrillGame.js`, `mwVisualEngine.js`,
  `multiplayerClient.js`, `crypticDatabase.js`, etc.). It is a client-side canvas game.
- In `moveweight-ui` it is launched from `GameOverlay.jsx` (3,379 lines) which is a **multi-game
  shell** importing ~20 unrelated arcade games. We deliberately do NOT reuse `GameOverlay.jsx`.
- Cryptic overlays (React): `CrypticInventoryOverlay.jsx`, `CrypticSkillTreeOverlay.jsx`,
  `CrypticStashOverlay.jsx`, `CrypticQuestLog.jsx`, `CrypticPauseOverlay.jsx`,
  `CrypticFishingMinigame.jsx`, plus ArcForge admin overlays
  (`ArcForgePalette.jsx`, `ArcForgeTransformPopup.jsx`, `ArcForgeInGameQueue.jsx`).
- `CrypticRealmGame` constructor signature (from `GameOverlay.jsx:2324`):
  `new CrypticRealmGame(canvas, crypticClass, crypticDiff, crypticAct, gQuality, saveRef, opts)`
  where `opts = {settings, accountKey, apiSettings, characterId, chromeTopInset, isAdmin}`.
- ArcForge editor for ClaudeCraft (`src/ui/cryptic/arcforge_editor.ts`, 307 lines, +
  `server/arcforge_proxy.ts`) **IS present** on the current `codex/cryptic-v016-catchup` branch
  (verified 2026-06-28: dashboard.ts:23 imports `handleArcForgeProxy`, line 203 mounts
  `/me/api/arcforge/`). It is a **pipeline-enqueue** editor only (stage picker, image upload,
  enqueue regen jobs). It does NOT have the original's live placeable palette/transform system.
  So the ArcForge work is **verify-existing + extend with placeables**, not restore-from-history.
- cryptic-realm is **vanilla TS + Vite**; landing entry is `src/landing.ts` with a
  `PANELS` array (`#mode-select`, `#login-panel`, `#realm-panel`, `#charselect-panel`,
  `#offline-select`). It currently has **no React dependency**.

## Decisions (locked with user)

| Question | Decision |
|---|---|
| How does Original run? | **A — Embedded bundle** inside cryptic-realm |
| Entry point | **Mode-select toggle** (Classic vs ClaudeCraft) |
| Saves | **Keep the original's own** (Cloudflare D1 + localStorage), self-contained |
| ArcForge scope | **Restore prior editor (239acfa5) + rebuild from original** placeable system |
| React wrapper | **A — Bring a React island**, but a NEW focused mount, not `GameOverlay.jsx` |

## Architecture

Three workstreams, all landing in the `cryptic-realm` repo.

### 1. Classic mode entry (landing.ts)

- Add a **Classic** choice to the `#mode-select` panel alongside the existing ClaudeCraft flow.
- Selecting Classic calls a new `launchClassic()` in `landing.ts`:
  1. `const mod = await import('./classic/classic-entry')` (dynamic — React loads only here)
  2. `mod.mountClassic(document.getElementById('classic-root'))`
  3. shows a full-screen `#classic-root`, hides the landing panels.
- A "← Back to CrypticRealm.com" control calls `mod.unmountClassic()` and restores `#mode-select`.
- ClaudeCraft realm flow (`#realm-panel` etc.) is untouched.

### 2. The React island (src/classic/)

```
src/classic/
├─ engine/            CrypticRealmGame.js + ~15 sibling modules, copied verbatim
├─ overlays/          Cryptic*.jsx (Inventory/SkillTree/Stash/Quest/Pause/Fishing)
│                     + ArcForge admin overlays (Palette/Transform/InGameQueue)
├─ ClassicCrypticMount.jsx   NEW focused shell (class-select → new CrypticRealmGame() → overlays)
└─ classic-entry.tsx         React root mount/unmount API: mountClassic(el) / unmountClassic()
```

- `ClassicCrypticMount.jsx` is a **new, small** component (target a few hundred LOC) that
  reimplements only the class-select → launch glue and overlay wiring. It does the work the
  Cryptic slice of `GameOverlay.jsx` did, without the 20-game shell.
- The engine modules and overlays are **copied verbatim** from `moveweight-ui/src/` into
  `src/classic/`. Import paths are rewritten to the new locations. No behavioral edits to the
  engine — it is treated as a vendored artifact.
- **Saves**: the island uses the original's own save path (`gameSaveSystem.js` / `crypticDatabase.js`
  → Cloudflare D1 + localStorage), copied along with the engine. No bridge to ClaudeCraft accounts.
- **React** is added to cryptic-realm `package.json` (`react`, `react-dom`) but only the
  dynamically-imported `classic-entry.tsx` chunk pulls it in, keeping the default ClaudeCraft
  bundle free of React.

### 3. ArcForge for ClaudeCraft realms

- Verify the **existing** `src/ui/cryptic/arcforge_editor.ts` + `server/arcforge_proxy.ts`
  still build and the proxy stays admin/mod-gated (already mounted in dashboard.ts:203).
- **Extend** with the original's placeable capabilities: port the `CR_ADMIN_PLACEABLES` palette
  and transform-gizmo concepts (`ArcForgePalette.jsx` / `ArcForgeTransformPopup.jsx`) into the
  ClaudeCraft in-game editor so admins can place/transform assets in the live scene, not only
  enqueue regeneration jobs. (This is the ClaudeCraft-side editor, separate from the Classic
  island's own ArcForge overlays, which come along vendored with the engine.)

## Components & interfaces

| Unit | Responsibility | Interface | Depends on |
|---|---|---|---|
| `landing.ts` (modified) | Mode-select toggle, lazy island loader | DOM events; `import('./classic/classic-entry')` | classic-entry |
| `classic-entry.tsx` | React root lifecycle | `mountClassic(el)`, `unmountClassic()` | React, ClassicCrypticMount |
| `ClassicCrypticMount.jsx` | Class-select → launch → overlay wiring | React component | engine/, overlays/ |
| `src/classic/engine/*` | The original game (vendored) | `new CrypticRealmGame(...)`, exports | self-contained |
| `src/classic/overlays/*` | Cryptic React overlays (vendored) | React components | engine/ |
| `arcforge_editor.ts` (restored+ext) | ClaudeCraft in-game admin editor | overlay; `/me/api/arcforge/*` | user/api roles |
| `arcforge_proxy.ts` (restored) | Server proxy to pipeline | `handleArcForgeProxy` | dashboard.ts, db.ts |

## Data flow

- **Classic play:** landing → `mountClassic` → React island → `new CrypticRealmGame(canvas, ...)`
  → canvas RAF loop; saves go to the original's D1/localStorage path. No ClaudeCraft server calls.
- **ArcForge (ClaudeCraft):** in-game editor → `POST /me/api/arcforge/enqueue` (player session token)
  → `arcforge_proxy.ts` validates admin/mod → forwards to LAN pipeline
  (`ARCFORGE_PIPELINE_BASE` / `ARCFORGE_BACKEND_BASE`).

## Error handling

- `launchClassic()` wraps the dynamic import in try/catch; on failure show a toast and stay on
  mode-select (don't leave a blank `#classic-root`).
- Engine asset 404s: the vendored engine already has fallback chains
  (`crFrameFallbackUrls`, `crTemplateFallbackUrls`); ensure referenced asset base URLs resolve
  under cryptic-realm (copy required atlases/templates into `public/classic/` or repoint base URL).
- ArcForge proxy: anon/bad token → 403; pipeline unreachable → 502 surfaced to the editor UI.

## Testing

Playwright smoke on `dev.crypticrealm.com` (stage port 8803):

1. `#mode-select` shows a **Classic** entry.
2. Clicking Classic mounts `#classic-root` and the original game canvas renders (class-select visible).
3. "Back" returns to mode-select; ClaudeCraft realm list still loads (`/api/realms`).
4. ArcForge editor: admin token → editor opens; anon → `/me/api/arcforge/health` returns 403.
5. Default (non-Classic) bundle does not pull React (chunk check / network panel).

## Deploy ("make it live")

Per `crypticrealm_staging` memory:

1. Commit to working branch; push to `codex/cryptic-token-runtime`.
2. `deploy-stage.sh crypticrealm dev`; verify on `dev.crypticrealm.com` with Playwright.
3. Roll out: `git branch -f alpha beta live codex/cryptic-token-runtime && git push origin alpha beta live`,
   then `deploy-stage.sh crypticrealm {alpha,beta,live}` (or promote.sh).
4. **Verify the PUBLIC apex serves the new bundle hash** (`curl https://crypticrealm.com/ | grep main-*.js`)
   — "curl localhost:PORT=200" is NOT "live". Apex routes via Traefik CT107 → crypticrealm-live (8800).
5. GitHub: push all branches to `BlizzHacker/cryptic-realm`.

## Risks / open items

- **Engine import-path rewrites**: ~15 modules with cross-imports; a missed rewrite breaks the
  build. Mitigation: copy the whole sibling-module set as one unit, grep for unresolved `./` imports.
- **Asset base URLs**: original references MoveWeight asset paths; must resolve under cryptic-realm.
- **React + Vite config**: cryptic-realm Vite must handle `.jsx`/`.tsx` for the island
  (add `@vitejs/plugin-react`, scoped or global). Confirm it doesn't disturb existing TS entries.
- **Nakama/multiplayer in the original**: Classic keeps its own multiplayer client; if the
  Nakama host isn't reachable from CrypticRealm.com origin, multiplayer degrades to offline
  (acceptable for v1 — single-player Classic is the target).

## Out of scope (v1)

- Bridging Classic saves to ClaudeCraft accounts.
- Porting the 20 other MoveWeight arcade games.
- Rewriting any original game systems into the ClaudeCraft engine (that was approach C, rejected).
