# QA Checklist

- [ ] Every home realm has explicit factions and class coverage.
- [ ] Claudecraft assets remain unchanged.
- [ ] PICKTURA intake records source, license, animation clips, realm, and size.
- [ ] Character select never shows a blank preview on asset failure.
- [ ] Infernal waypoint has safe approach, visible landing surface, collision, and return travel.
- [ ] Racing and brawler work with CPU opponents and real players.
- [ ] Racing has visible driver pose, correct track-facing orientation, NPC field, and level travel.
- [ ] RTS has hidden map until scouting, useful camera zoom, controls, production, and combat.
- [ ] Tower defense supports tower positions, repairs, fortifications, upgrades, first-person firing, and waves.
- [ ] Desktop and mobile screenshots show the intended result.
- [ ] No browser console errors during core flows.
- [ ] Focused tests, `npm run ci:changed`, `npx tsc --noEmit`, `npm run asset:budget`, and `npm run gate` pass.
- [ ] Recovery manifest, backup, rollback, stage, health, and promotion evidence are current before any live mutation.
