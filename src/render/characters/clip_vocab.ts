// Shared clip vocabularies, one per RIG FAMILY.
//
// Two incompatible skeletons ship in this game and three.js binds animation
// tracks BY NODE NAME, so which family a body belongs to decides what it can
// ever be made to do:
//
//   kaykit   root/hips/spine/chest/upperarm.l/handslot.r ...  (23 joints)
//            Every pipeline-rigged library body (1,649 of them) plus the
//            shipped player/NPC GLBs. Carries the 22-clip KayKit vocabulary
//            baked in, so its extended vocabulary is built from its OWN clips.
//   meshy24  Hips/LeftUpLeg/Spine01/LeftForeArm/Head ...      (24 joints)
//            The curated Meshy bodies - the Infernal hero roster, the Infernal
//            human townsfolk, the Infernal class bodies. These ship 6-10 clips
//            and are the ONLY family the shared clip bank can drive.
//
// The bank (meshy_clip_bank.glb, 48 rotations-only clips) is authored on the
// meshy24 skeleton. Handing it to a kaykit body would still produce live
// AnimationActions with the right names that drive NOTHING - the exact "listed
// clips, zero motion" failure this file exists to make impossible. assets.ts
// enforces that at load time (a donor clip that binds no track is dropped and
// logged); this file makes sure we never ask for it in the first place.
import type { OverheadEmoteId } from '../../world_api';
import type { ClipMap, EmoteClipSpec } from './manifest';

/** Armature-only GLB on the meshy24 skeleton. Mounted via VisualDef.animUrls. */
export const MESHY_CLIP_BANK_URL = '/cr-realms/shared/meshy_clip_bank.glb';

// ---------------------------------------------------------------------------
// kaykit family — built entirely from the body's own 22 baked clips.
// ---------------------------------------------------------------------------

/** Overhead emotes for kaykit bodies. No dedicated emote takes exist in the
 *  22-clip KayKit set, so each one is a repurposed combat/locomotion clip with
 *  a time scale that sells the gesture. Proven in motion on every player body. */
export const KAYKIT_EMOTES: Partial<Record<OverheadEmoteId, EmoteClipSpec>> = {
  wave: { clips: ['Spellcast_Raise', 'Cheer'], timeScale: 0.9 },
  laugh: { clips: ['Hit_A', 'Cheer'], timeScale: 1.45, repeats: 2 },
  question: { clips: ['Block', 'Spellcast_Raise'], timeScale: 1.15 },
  cheer: { clips: ['Cheer'], timeScale: 1.05, repeats: 2 },
  dance: {
    clips: ['Running_Strafe_Left', 'Running_Strafe_Right', 'Cheer'],
    timeScale: 1.05,
    repeats: 2,
  },
  point: { clips: ['Spellcast_Shoot', '2H_Ranged_Shoot'], timeScale: 0.95 },
  flex: { clips: ['Block', 'Cheer'], timeScale: 0.8 },
  salute: { clips: ['Spellcast_Raise', 'Block'], timeScale: 1.18 },
  cry: { clips: ['Hit_A', 'Sit_Floor_Down'], timeScale: 0.65 },
  bow: { clips: ['Sit_Floor_Down', 'Spellcast_Raise'], timeScale: 1.35 },
  clap: { clips: ['1H_Melee_Attack_Slice_Diagonal', 'Cheer'], timeScale: 1.55, repeats: 2 },
  roar: { clips: ['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop', 'Cheer'], timeScale: 0.9 },
  kneel: { clips: ['Sit_Floor_Down'], timeScale: 0.85 },
  alert: { clips: ['Block'], timeScale: 1.1 },
  lookaround: { clips: ['Idle'], timeScale: 0.9, repeats: 2 },
  carry: { clips: ['Walking_A'], timeScale: 0.8, repeats: 2 },
  roll: { clips: ['Jump_Idle'], timeScale: 1.2 },
  collapse: { clips: ['Death_A'], timeScale: 1.3 },
  shuffle: { clips: ['Running_Strafe_Left'], repeats: 2 },
  shimmy: { clips: ['Running_Strafe_Right'], repeats: 2 },
};

// ---------------------------------------------------------------------------
// meshy24 family — the shared clip bank.
// ---------------------------------------------------------------------------

/** Extra swings the bank contributes. visual.ts rotates the attack array per
 *  swing, so a body that shipped ONE attack take stops repeating itself. */
export const MESHY_BANK_ATTACKS: readonly string[] = [
  'Attack_Spin',
  'Attack_Combo',
  'Attack_Charged',
  'Attack_Punch',
  'Attack_Kick',
  '1H_Melee_Attack_Chop',
  '1H_Melee_Attack_Slice_Diagonal',
  '2H_Melee_Attack_Chop',
];

/** Signature-ability gestures, keyed on the upstream class ability ids. */
export const MESHY_BANK_ABILITY_ATTACKS: Readonly<Record<string, string>> = {
  bladestorm: 'Attack_Spin',
  blade_flurry: 'Attack_Combo',
  hemorrhage: 'Attack_Combo',
  mortal_strike: 'Attack_Charged',
  heroic_strike: 'Attack_Charged',
  crusader_strike: 'Attack_Charged',
  execute: '2H_Melee_Attack_Chop',
  storm_bolt: 'Attack_Punch',
  kick: 'Attack_Kick',
  victory_rush: 'Attack_Leap',
  feral_charge: 'Attack_Leap',
  counter_shot: '2H_Ranged_Shoot',
  wyvern_sting: '2H_Ranged_Shoot',
  holy_shield: 'Block',
  ice_block: 'Block',
  shield_slam: 'Block_B',
  blink: 'Dodge_Back',
  bestial_wrath: 'Taunt_Stomp',
  demoralizing_shout: 'Taunt_Stomp',
  intimidating_shout: 'Emote_Roar',
  holy_shock: 'Spellcast_Shoot',
  conflagrate: 'Spellcast_Shoot',
  combustion: 'Spellcasting',
  meteor: 'Spellcast_Raise',
  avatar: 'Spellcast_Raise',
  metamorphosis: 'Spellcast_Raise',
};

/** Overhead emotes for meshy24 bodies. Unlike KayKit, the bank carries REAL
 *  emote takes, so each id names its own gesture first. `Emote_Laugh` and
 *  `Emote_Salute` are contract names the bank does not (yet) fill - they stay
 *  first so a later bank rebuild picks them up without a code change, and the
 *  entries behind them are what actually plays today. */
export const MESHY_BANK_EMOTES: Partial<Record<OverheadEmoteId, EmoteClipSpec>> = {
  wave: { clips: ['Emote_Wave', 'Cheer'] },
  laugh: { clips: ['Emote_Laugh', 'Emote_Cheer', 'Cheer'], timeScale: 1.2 },
  question: { clips: ['Emote_Question', 'Guard_Stance'] },
  cheer: { clips: ['Emote_Cheer', 'Cheer'], repeats: 2 },
  dance: { clips: ['Emote_Dance_A', 'Emote_Dance_B'] },
  point: { clips: ['Emote_Point', 'Spellcast_Shoot'] },
  flex: { clips: ['Emote_Flex', 'Taunt_Stomp'] },
  salute: { clips: ['Emote_Salute', 'Emote_Point'] },
  // Emote_Cry / Emote_Bow ARE in the bank. They were aliased onto Sit_Floor_Down
  // and Emote_Point, so crying looked like sitting down and bowing was a
  // duplicate of point.
  cry: { clips: ['Emote_Cry', 'Sit_Floor_Down'], timeScale: 0.8 },
  bow: { clips: ['Emote_Bow', 'Emote_Point'], timeScale: 0.9 },
  clap: { clips: ['Emote_Clap', 'Emote_Cheer'], repeats: 2 },
  roar: { clips: ['Emote_Roar', 'Taunt_Stomp'] },
  kneel: { clips: ['Emote_Kneel', 'Sit_Floor_Down'] },
  alert: { clips: ['Idle_Alt_B', 'Guard_Stance'] },
  lookaround: { clips: ['Idle_Alt_A'], timeScale: 0.9 },
  carry: { clips: ['Carry_Walk', 'Walking_A'], repeats: 2 },
  roll: { clips: ['Land_Roll', 'Dodge_Back'] },
  collapse: { clips: ['Death_B'], timeScale: 1.2 },
  shuffle: { clips: ['Running_Strafe_Left'], repeats: 2 },
  shimmy: { clips: ['Running_Strafe_Right', 'Running_A'], repeats: 2 },
};

/** Bank clips a meshy24 body inherits for every state it has no take of its own.
 *  The body's OWN idle/walk/run always win: its gait was authored for its own
 *  proportions, and the bank exists to fill gaps, not to replace what works. */
export function withMeshyBank(core: ClipMap): ClipMap {
  const emote: Partial<Record<OverheadEmoteId, EmoteClipSpec>> = {};
  const ids = new Set<OverheadEmoteId>([
    ...(Object.keys(MESHY_BANK_EMOTES) as OverheadEmoteId[]),
    ...(Object.keys(core.emote ?? {}) as OverheadEmoteId[]),
  ]);
  for (const id of ids) {
    const bank = MESHY_BANK_EMOTES[id];
    const own = core.emote?.[id];
    if (!bank) {
      if (own) emote[id] = own;
      continue;
    }
    // Bank gesture first, the body's own take appended as the fallback: the
    // Infernal humans ship real Wave/Taunt clips and must keep working even if
    // the bank ever fails to load.
    emote[id] = own
      ? { ...bank, clips: [...bank.clips, ...own.clips.filter((c) => !bank.clips.includes(c))] }
      : bank;
  }
  return {
    ...core,
    walkBack: core.walkBack ?? 'Walking_Backwards',
    attack: [...core.attack, ...MESHY_BANK_ATTACKS.filter((a) => !core.attack.includes(a))],
    hit: [...new Set([...(core.hit ?? []), 'Hit_A'])],
    cast: core.cast ?? 'Spellcasting',
    death: core.death,
    flourish: core.flourish ?? 'Spellcast_Raise',
    attackByAbility: { ...MESHY_BANK_ABILITY_ATTACKS, ...core.attackByAbility },
    sitDown: core.sitDown ?? 'Sit_Floor_Down',
    sitIdle: core.sitIdle ?? 'Sit_Floor_Idle',
    swim: core.swim ?? 'Lie_Idle',
    jump: core.jump ?? 'Jump_Idle',
    stow: core.stow ?? 'Guard_Stance',
    emote,
  };
}
