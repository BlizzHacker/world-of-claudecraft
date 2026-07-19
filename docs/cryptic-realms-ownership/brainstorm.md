# Vision and Current State

## Locked direction

- Cryptic Realm is a mixed bestiary and mixed class universe.
- Arcane and Arcane Void are space, crystal, and void themed.
- Infernal is a Diabl0-inspired heaven-versus-hell realm with room for tainted angels, good vampires, redeemed demons, and other faction surprises.
- Classic is the orc, elf, dwarf, and Warcraft-style realm.
- FPS is shooter characters, firearms, cover, and first-person presentation.
- Claudecraft keeps its existing assets and behavior.
- Racing and brawler are physical world venues with real NPC signups and deterministic practice opponents.
- RTS and tower defense are deliberate strategy views opened by world NPCs or boards, not menu toys.
- Fishing is a world interaction at every validated body of water.
- Eastbrook Homes is a separate premium housing feature, not a minigame.

## Verified gaps

- The character-select preview can be blank when realm GLBs are unavailable.
- The current local authoritative server cannot start without the local Postgres service and `DATABASE_URL`.
- The USB4 PICKTURA library is available at `T:\meshy\PICKTURA`, with 1,840 animated files and a machine-readable manifest at `T:\meshy\PICKTURA\_manifest`.
- The existing realm asset pipeline understands local realm folders and Meshy API downloads, but not the mounted PICKTURA library directly.
- The recovery manifest still records the minigame and housing features as open even though venue code exists on the candidate branch.
- The specified production container reports a different commit and an untracked `secrets/` directory than the documented preserved identity. Promotion is blocked until reconciled.

## Asset selection principles

- Prefer models with stable names, a skinned rig, and a complete idle, locomotion, combat, hit, and death set.
- Use the smallest curated set needed for a realm slice; do not bulk-copy 1,840 files into the client.
- Keep source metadata, CC0 attribution, animation names, and realm assignment in the generated asset manifest.
- The Infernal Dungeon Entrance GLB is a waypoint prop. It belongs at a clearly navigable, safe approach point with a visible landing pad, sign, collision boundary, and return route, not in a random combat pocket.
