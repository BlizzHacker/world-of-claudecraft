# ArcForge Character Readiness

Updated: 2026-07-02

## Rules

- KayKit player bodies stay in ClaudeCraft. Other realms should show unique realm GLBs or a clear Coming Soon state.
- Do not reuse the same GLB across multiple realm classes unless the class is explicitly a variant of that same body.
- Character preview animations must start on idle, walk, run, or a clean combat clip. Avoid dance, death, hit, or imported one-off clips for the first impression.
- A class can remain playable by gameplay class even when its realm model is Coming Soon. The UI must not pretend the model is finished.

## Current UI Mapping

### Cryptic Realm

- Gravecaller / Warlock: Bone Herald Black GLB, Animation Pass. Run/walk only; needs idle, attack, cast, hit, death.
- Rune Warden, Gargoyle Oathsworn, Crypt Stalker, Cipher Blade, Oracle, Grave Totemist, Void Seer, Chimera Warden: Coming Soon.

### Infernal Realm

- Iron Warden / Warrior: Crimson Infernal Behemoth GLB, Animation Pass. Movement/jump pack; needs melee, cast, hit, death.
- Shadow Blade / Rogue: Horned Demon GLB, Animation Pass. Run/walk only; needs combat and spell coverage.
- Plague Shifter / Druid: Skullbeast GLB, Playable GLB. Has locomotion plus slash; still needs class-specific casting and death.
- Hellknight, Pit Stalker, Blood Bishop, Ash Shaman, Ember Witch, Bone Herald: Coming Soon.

### Classic Realm

- Alliance Knight / Warrior: Gray Dwarf GLB, Animation Pass.
- Alliance Paladin / Paladin: Fighting Elf GLB, Playable GLB.
- Horde Ranger / Hunter: Animated Orc GLB, Playable GLB.
- Horde Outrider / Rogue: Female Orc GLB, Animation Pass.
- Alliance Cleric / Priest: Female Elf GLB, Animation Pass.
- Horde Shaman / Shaman: Armored Orc GLB, Animation Pass.
- Alliance Archmage / Mage: Treasure Dwarf GLB, Animation Pass.
- Horde Druid / Druid: Kitty GLB, Animation Pass.
- Horde Warlock / Warlock: Coming Soon.

### Arcane Void

- Terran Dominion, Protoss Alliance, and Zerg Swarm classes are all Coming Soon until real Arcane Void GLBs exist.
- Do not fall back to the ClaudeCraft/KayKit mech in this realm. Build actual Terran marine/ghost/engineer, Protoss templar/preserver, and Zerg lurker/infestor/mutalist bodies.

## Meshy / ArcForge Queue

For every Coming Soon class, create or refine a dedicated GLB in Meshy, then run it through ArcForge:

1. Meshy text/image-to-3D in A-pose or T-pose where humanoid. Use low-poly friendly prompts and preserve faction silhouette.
2. Meshy rigging for standard humanoid/biped outputs. For non-humanoid Zerg or beast bodies, accept preview-only until a manual rig exists.
3. Animation pack target: idle, walk, run, basic attack, spell cast, hit react, death, jump. Add class-specific clips when available.
4. Run `node scripts/build_realm_assets.mjs` to refresh `public/cr-realms/<realm>/manifest.json` and copy GLBs into `C:\mnt\usb4\moveweight-assets\forged-glbs`.
5. Update `src/ui/cryptic/realm_class_presentation.ts` only when a class has a unique GLB. Keep Animation Pass if the clip pack is incomplete.

## Claude Handoff

- Next rendering step: map these realm character assets into in-world player/NPC visuals, not just selection preview.
- Replace realm NPC KayKit placeholders with realm-appropriate visual keys; keep KayKit NPCs only in ClaudeCraft.
- Arcane Void needs the largest asset push: it currently has concept PNGs but no usable GLB class bodies.
- Keep dev ring characters on dev during promotion. Alpha promotion is code-only from dev; alpha characters promote to beta, beta characters promote to live.
