# Implementation Plan

## Phase 1: Identity foundations

- Add explicit faction definitions to every Cryptic Realm overlay.
- Preserve Claudecraft's current content and class presentation.
- Add tests for faction uniqueness, class coverage, alignment surprises, and realm isolation.

## Phase 2: Asset intake and waypoint placement

- Add PICKTURA manifest ingestion from USB4 without checking binary source paths into code.
- Curate initial playable characters, NPCs, monsters, props, and vehicles by realm.
- Promote the Infernal Dungeon Entrance as an authored waypoint with safe placement, colliders, and navigation evidence.

## Phase 3: Character and creature replacement

- Make character-select previews resilient when optional realm assets are missing.
- Wire selected realm visuals into the same render manifest used in-world.
- Replace realm-inappropriate NPC and monster visuals while keeping simulation identities and server authority stable.

## Phase 4: Complete world venues

- Racing: real track, multiple authored levels, NPC field, correct vehicle orientation, visible driver pose, and travel between levels.
- Brawler: Boarpit NPC signup, CPU practice, player matchmaking, KO rules, and travel back to the world.
- RTS: fog-of-war, camera zoom, scouts, commands, production, combat, and campaign travel.
- Tower defense: first-person tower positions, repair and fortification, weapon upgrades, waves, and co-op support.

## Phase 5: Evidence and promotion

- Run desktop and mobile browser screenshots, console-error checks, focused Vitest suites, full gate, asset budget, and local/stage smoke.
- Update the QA loop ledger and report.
- Back up the branch to GitHub. Production promotion remains conditional on manifest identity, private backup, isolated stage, rollback ref, and health gates.
