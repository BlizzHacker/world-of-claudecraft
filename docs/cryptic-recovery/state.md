# State handoff

## Locked decisions

- `src/sim/` remains DOM-free and deterministic; randomness only uses `Rng`.
- `IWorld` is the only presentation seam. Offline `Sim` and online `ClientWorld` must stay in
  parity, and the server owns outcomes.
- New minigames remain `enabled:false` until mode-specific persistence, mobile, reconnect,
  accessibility, and staged QA are complete. `ALLOW_MINIGAME_PREVIEW=1` is local/isolated only.
- Exchange writes are served only by the process with `CR_CROSS_REALM=1`; normal realms are
  read-only for custody.
- Production target is Proxmox `192.168.0.6`, LXC 171, `/opt/cryptic-realm`. Legacy profiles are
  not valid deployment targets.

## Key seams

- Arcade domain: `src/sim/minigames/arcade.ts`
- Session lifecycle and solo bots: `src/sim/minigames/session.ts`
- Offline host: `src/sim/sim.ts`
- Online host/wire: `server/game.ts`, `src/net/online.ts`, `src/world_api.ts`
- Launcher: `src/ui/arcade_minigame_window.ts`, `src/ui/hud.ts`
- Exchange custody: `server/exchange/api.ts`, `server/exchange/db.ts`,
  `src/sim/exchange/custody.ts`

## Known blockers

- `node scripts/admin/check_recovery_manifest.mjs --strict` fails closed because exhaustive ref
  discovery/patch-ID classification and isolated stage identity are not complete.
- Full `npm run gate` currently stops at i18n freshness when unrelated pre-existing admin generated
  artifacts are unstaged. Preserve those changes; never stage them opportunistically.
