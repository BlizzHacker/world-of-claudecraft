import type { MobTemplate } from '../types';

// Warlock demon pets. Summoned (never tamed) demons owned by a warlock; they
// follow/assist exactly like hunter pets (see Sim.updatePet) but never go feral
// — a slain or dismissed demon unravels. The Imp is a ranged Firebolt damage
// pet; the Voidwalker is a sturdy melee tank that taunts to hold threat. Created
// at the owner's level (createMob reads the passed level, not minLevel/maxLevel).
export const WARLOCK_PET_MOBS: Record<string, MobTemplate> = {
  imp: {
    id: 'imp', name: 'Imp', minLevel: 1, maxLevel: 60, family: 'demon',
    // squishy ranged caster: low health and armor, steady Firebolt damage
    hpBase: 30, hpPerLevel: 12,
    dmgBase: 5, dmgPerLevel: 1.6, attackSpeed: 2.0,
    armorPerLevel: 8, moveSpeed: 5.2, aggroRadius: 8,
    loot: [], scale: 0.55, color: 0xff7a2a,
    petRanged: { range: 25, school: 'fire' },
  },
  voidwalker: {
    id: 'voidwalker', name: 'Voidwalker', minLevel: 1, maxLevel: 60, family: 'demon',
    // tank: deep health pool and heavy armor, modest melee damage, taunts
    hpBase: 70, hpPerLevel: 28,
    dmgBase: 4, dmgPerLevel: 1.2, attackSpeed: 2.0,
    armorPerLevel: 45, moveSpeed: 5.0, aggroRadius: 8,
    loot: [], scale: 1.15, color: 0x3a3a6e,
  },
};
