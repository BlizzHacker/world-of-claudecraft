// Cryptic Realm bestiary — acts, zones, monsters, and bosses for the Monster
// Chronicle. Ported from the original Cryptic Realm engine
// (cryptic/monsters/crMonsterData.js). Display content only; the base sim
// drives actual combat.

import type { RealmBestiary } from '../types';

export const CRYPTICREALM_BESTIARY: RealmBestiary = [
  {
    id: 'act1',
    name: 'Act I: The Ashen Crypts',
    level: [1, 15],
    desc: 'Beneath the ruined cathedral, the dead stir again. Fungal growths pulse with undeath.',
    zones: ['Cathedral Ruins', 'Fungal Caverns', 'Bone Pit', 'Ashen Crypt'],
    monsters: [
      { id: 'skeleton_warrior', name: 'Skeleton Warrior', level: 2, hp: 80, dmg: 12, type: 'Undead', xp: 25, gold: 8, drops: ['common_weapon', 'common_armor'] },
      { id: 'crypt_rat', name: 'Crypt Rat', level: 1, hp: 40, dmg: 8, type: 'Beast', xp: 12, gold: 3, drops: ['potion_hp'] },
      { id: 'fungal_shambler', name: 'Fungal Shambler', level: 4, hp: 150, dmg: 18, type: 'Plant', xp: 45, gold: 15, drops: ['magic_ring', 'potion_hp'] },
      { id: 'bone_archer', name: 'Bone Archer', level: 5, hp: 100, dmg: 22, type: 'Undead', xp: 40, gold: 12, drops: ['common_weapon', 'magic_amulet'] },
      { id: 'tomb_guardian', name: 'Tomb Guardian', level: 8, hp: 300, dmg: 28, type: 'Construct', xp: 80, gold: 30, drops: ['rare_armor', 'rare_weapon'] },
      { id: 'corpse_mage', name: 'Corpse Mage', level: 10, hp: 180, dmg: 35, type: 'Undead', xp: 100, gold: 45, drops: ['magic_staff', 'rare_ring'] },
    ],
    bosses: [
      {
        id: 'king_ashgrave', name: 'King Ashgrave', level: 12, hp: 2500, dmg: 55, type: 'Undead Boss',
        xp: 800, gold: 250,
        abilities: ['Bone Storm', 'Raise Champions', 'Death Nova', 'Summon Bone Wall'],
        phases: [
          { threshold: 75, ability: 'Raises 4 skeleton champions' },
          { threshold: 50, ability: 'Casts Bone Storm — AoE damage for 8s' },
          { threshold: 25, ability: 'Death Nova — massive AoE, must dodge' },
        ],
        loot: ['Doombringer', 'rare_helmet', 'legendary_ring', '500 gold'],
        lore: 'Once the last king of the Ashen Court, he swore an oath to guard the crypts forever. Death could not release him from his vow.',
      },
      {
        id: 'fungal_mother', name: 'The Fungal Mother', level: 8, hp: 1800, dmg: 40, type: 'Plant Boss',
        xp: 500, gold: 180,
        abilities: ['Spore Cloud', 'Root Prison', 'Regeneration', 'Spawn Mycelium'],
        phases: [
          { threshold: 60, ability: 'Releases toxic spore cloud covering arena' },
          { threshold: 30, ability: 'Spawns 6 mycelium minions + rapid regen' },
        ],
        loot: ['Heart of the Mountain', 'magic_armor', 'rare_gloves', '300 gold'],
        lore: 'A colossal fungal organism that has consumed the entire cavern system. Its roots reach into the bones of the dead.',
      },
    ],
  },
  {
    id: 'act2',
    name: 'Act II: The Ember Wastes',
    level: [15, 30],
    desc: 'Scorched deserts and volcanic forges where fire demons rule. The air itself burns.',
    zones: ['Scorched Bazaar', 'Molten Forge', 'Cinder Dunes', 'Volcanic Core'],
    monsters: [
      { id: 'fire_imp', name: 'Fire Imp', level: 15, hp: 200, dmg: 30, type: 'Demon', xp: 60, gold: 20, drops: ['magic_weapon', 'fire_rune'] },
      { id: 'sand_wraith', name: 'Sand Wraith', level: 17, hp: 280, dmg: 35, type: 'Elemental', xp: 75, gold: 25, drops: ['rare_ring', 'potion_mana'] },
      { id: 'magma_golem', name: 'Magma Golem', level: 20, hp: 500, dmg: 42, type: 'Construct', xp: 120, gold: 40, drops: ['rare_armor', 'magma_core'] },
      { id: 'cinder_archer', name: 'Cinder Archer', level: 18, hp: 250, dmg: 38, type: 'Demon', xp: 85, gold: 30, drops: ['magic_weapon', 'rare_boots'] },
      { id: 'forge_sentinel', name: 'Forge Sentinel', level: 22, hp: 600, dmg: 48, type: 'Construct', xp: 150, gold: 55, drops: ['legendary_weapon', 'rare_helmet'] },
      { id: 'lava_drake', name: 'Lava Drake', level: 25, hp: 800, dmg: 55, type: 'Dragon', xp: 200, gold: 80, drops: ['rare_armor', 'legendary_ring', 'drake_scale'] },
    ],
    bosses: [
      {
        id: 'infernal_smith', name: 'The Infernal Smith', level: 25, hp: 5000, dmg: 75, type: 'Demon Boss',
        xp: 2000, gold: 600,
        abilities: ['Molten Hammer', 'Lava Wave', 'Forge Armor', 'Enrage'],
        phases: [
          { threshold: 70, ability: 'Forges new armor — defense +50% for 10s' },
          { threshold: 40, ability: 'Lava Wave — ground fire covers 60% of arena' },
          { threshold: 15, ability: 'Enrage — attack speed doubled, defense halved' },
        ],
        loot: ["Titan's Grip", 'legendary_weapon', 'rare_armor', '1000 gold'],
        lore: 'Bound to the forge by chains of hellfire, the Smith hammers weapons for the demon army. Each strike shakes the volcano.',
      },
      {
        id: 'drake_queen', name: 'Drake Queen Pyralis', level: 30, hp: 7500, dmg: 90, type: 'Dragon Boss',
        xp: 3500, gold: 1000,
        abilities: ['Fire Breath', 'Wing Buffet', 'Egg Hatch', 'Dive Bomb'],
        phases: [
          { threshold: 80, ability: 'Takes flight — ranged attacks only' },
          { threshold: 50, ability: 'Hatches 3 drake eggs — adds join fight' },
          { threshold: 20, ability: 'Dive Bomb — instant kill zone, must dodge' },
        ],
        loot: ['Windrunner Boots', 'legendary_armor', 'mythic_ring', '2000 gold'],
        lore: "The last of the ancient drakes, Pyralis nests in the volcano's heart. Her eggs hold the future of dragonkind.",
      },
    ],
  },
  {
    id: 'act3',
    name: 'Act III: The Void Nexus',
    level: [30, 50],
    desc: 'Reality fractures here. Portals to a thousand dimensions flicker in and out of existence.',
    zones: ['Nexus Gateway', 'Crystal Labyrinth', 'Rift Wastes', 'The Void Core'],
    monsters: [
      { id: 'void_stalker', name: 'Void Stalker', level: 32, hp: 500, dmg: 60, type: 'Aberration', xp: 180, gold: 60, drops: ['rare_weapon', 'void_shard'] },
      { id: 'crystal_sentry', name: 'Crystal Sentry', level: 35, hp: 600, dmg: 55, type: 'Construct', xp: 200, gold: 70, drops: ['rare_armor', 'crystal_fragment'] },
      { id: 'rift_phantom', name: 'Rift Phantom', level: 38, hp: 400, dmg: 70, type: 'Aberration', xp: 220, gold: 80, drops: ['legendary_ring', 'rift_essence'] },
      { id: 'dimensional_horror', name: 'Dimensional Horror', level: 42, hp: 900, dmg: 80, type: 'Aberration', xp: 300, gold: 100, drops: ['legendary_weapon', 'mythic_amulet'] },
      { id: 'nexus_guardian', name: 'Nexus Guardian', level: 45, hp: 1200, dmg: 85, type: 'Construct', xp: 350, gold: 120, drops: ['legendary_armor', 'nexus_key'] },
    ],
    bosses: [
      {
        id: 'void_sovereign', name: 'The Void Sovereign', level: 45, hp: 12000, dmg: 110, type: 'Eldritch Boss',
        xp: 6000, gold: 2000,
        abilities: ['Void Collapse', 'Dimensional Tear', 'Null Field', 'Reality Shatter'],
        phases: [
          { threshold: 80, ability: 'Null Field — disables all skills for 3s' },
          { threshold: 55, ability: 'Dimensional Tear — splits arena into 2 realities' },
          { threshold: 30, ability: 'Void Collapse — gravity increases, movement halved' },
          { threshold: 10, ability: 'Reality Shatter — random instant-kill zones appear' },
        ],
        loot: ['Crown of the Void', 'mythic_weapon', 'mythic_armor', '5000 gold'],
        lore: 'Not a creature but a concept — the Void Sovereign is the will of the space between dimensions. To kill it is to kill a thought.',
      },
      {
        id: 'archon_eternal', name: 'Archon Eternal', level: 50, hp: 20000, dmg: 140, type: 'Final Boss',
        xp: 15000, gold: 5000,
        abilities: ['Cosmic Ray', 'Star Fall', 'Time Stop', 'Supernova', 'Rebirth'],
        phases: [
          { threshold: 90, ability: 'Star Fall — meteors rain for 10s' },
          { threshold: 70, ability: 'Time Stop — all players frozen for 4s' },
          { threshold: 45, ability: 'Supernova — full-screen damage, must use cover' },
          { threshold: 20, ability: 'Rebirth — heals to 50%, gains new abilities' },
          { threshold: 5, ability: 'Cosmic Ray — continuous beam, must keep moving' },
        ],
        loot: ['Eye of Eternity', 'Soul Drainer', 'mythic_weapon', 'mythic_ring', 'Belt of Many Pockets', '10000 gold'],
        lore: 'The first being to exist — and the last that will remain. The Archon has watched every star born and die. You are nothing. You are everything.',
      },
    ],
  },
];
