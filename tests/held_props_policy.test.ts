// Who is holding what, and why.
//
// Two live faults from the 2026-08-17 sweep:
//   - Fisherman Brandt, a fish vendor, stood in Eastbrook with an infernal
//     scythe in one hand and a round shield in the other. emit_manifest.mjs
//     sockets a hash-drawn weapon onto every generated body and exempts only
//     the ones whose FILENAME matched an "armed" regex - and those filenames
//     were laundered by ip_rename, so they do not describe the models.
//   - The Vale Cup bots resolved through `class:<engine class>` like real
//     characters, so on Infernal they wore the operator's published class
//     bodies: a necromancer with a staff at centre-forward, and several bodies
//     with zero baked clips that could not animate at all.

import { describe, expect, it } from 'vitest';
import {
  ARMED_NPC_TEMPLATES,
  forcedHeldLayoutFor,
  isValeCupBotBody,
  mobIsNonCombatant,
  npcRendersArmed,
} from '../src/render/characters/held_props_policy';
import { setBodyOverrides, VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { GENERATED_VISUALS } from '../src/render/characters/manifest.generated';
import { VC_BOT_BODY_KEYS } from '../src/sim/content/vale_cup';
import { MOBS, NPCS } from '../src/sim/data';
import { realmClassVisualKey } from '../src/sim/realms/class_visuals';
import { setActiveRealmForOffline } from '../src/sim/realms/registry';
import { makeWorld } from './vale_cup_util';
import type { RealmId } from '../src/sim/realms/types';
import type { Entity } from '../src/sim/types';
import { ALL_CLASSES } from '../src/sim/types';

// A generated body that carries the emit_manifest default layout: a melee
// weapon in handslot.r and a round shield in handslot.l.
const SOCKETED_BODY = 'realm_classic_potion_seller_hunched_old_01951fc0';

function npc(templateId: string): Entity {
  return { kind: 'npc', templateId } as unknown as Entity;
}
function mob(templateId: string): Entity {
  return { kind: 'mob', templateId } as unknown as Entity;
}
function player(templateId: string, visualKey: string | null = null): Entity {
  return { kind: 'player', templateId, visualKey } as unknown as Entity;
}

describe('held-prop policy', () => {
  it('the body under test really does carry the default weapon + shield', () => {
    const def = GENERATED_VISUALS[SOCKETED_BODY];
    expect(def).toBeDefined();
    expect(def.attach?.length).toBe(2);
    expect(def.weaponSlots).toEqual([0]);
    expect(def.offhandSlot).toBe(1);
  });

  it('empties the hands of an ordinary NPC', () => {
    // The reported case. Brandt sells fishing poles; he is not a fighter.
    const layout = forcedHeldLayoutFor(npc('fisherman_brandt'), SOCKETED_BODY);
    expect(layout).not.toBeNull();
    expect(layout?.attach).toBeUndefined();
    expect(layout?.weaponSlots).toBeUndefined();
    expect(layout?.offhandSlot).toBeUndefined();
  });

  it('leaves an armed NPC role holding its weapon', () => {
    expect(npcRendersArmed('marshal_redbrook')).toBe(true); // Town Marshal
    expect(forcedHeldLayoutFor(npc('marshal_redbrook'), SOCKETED_BODY)).toBeNull();
  });

  it('reads `grinds` from content data instead of duplicating it', () => {
    // Kael the Sellsword hunts field mobs, so the template already says he
    // fights; he is armed without being listed by hand.
    expect(NPCS.mercenary_kael?.grinds).toBe(true);
    expect(ARMED_NPC_TEMPLATES.has('mercenary_kael')).toBe(false);
    expect(npcRendersArmed('mercenary_kael')).toBe(true);
  });

  it('does not arm a civilian whose TITLE merely shares a word with a soldier', () => {
    // The trap a substring rule falls into: `marshal_redbrook` is a lawman,
    // `race_marshal_pip` keeps the grid book at a horse race.
    expect(npcRendersArmed('race_marshal_pip')).toBe(false);
    expect(npcRendersArmed('bellkeeper_tam')).toBe(false);
  });

  it('empties the hands of a non-combatant mob but not a real one', () => {
    // Fisher Bram is an escortee: moveSpeed 0, aggroRadius 0, damage that
    // never scales. He must not be issued a sword.
    expect(MOBS.fisher_bram?.aggroRadius).toBe(0);
    expect(mobIsNonCombatant('fisher_bram')).toBe(true);
    expect(forcedHeldLayoutFor(mob('fisher_bram'), SOCKETED_BODY)).not.toBeNull();
    // A warlock's imp cannot aggro either, but its damage scales - it fights.
    expect(mobIsNonCombatant('warlock_imp')).toBe(false);
    expect(mobIsNonCombatant('vale_bandit')).toBe(false);
    expect(forcedHeldLayoutFor(mob('vale_bandit'), SOCKETED_BODY)).toBeNull();
  });

  it('never disarms a player character', () => {
    for (const cls of ALL_CLASSES) {
      expect(forcedHeldLayoutFor(player(cls), SOCKETED_BODY)).toBeNull();
    }
  });

  it('leaves hand-authored bodies alone', () => {
    // Only emit_manifest.mjs hands out the default layout. A curated def that
    // carries a prop carries it on purpose.
    expect(GENERATED_VISUALS.npc_villager).toBeUndefined();
    expect(forcedHeldLayoutFor(npc('fisherman_brandt'), 'npc_villager')).toBeNull();
  });
});

describe('Vale Cup bot bodies', () => {
  it('are registered, animate, and carry a full clip vocabulary', () => {
    expect(VC_BOT_BODY_KEYS.length).toBeGreaterThan(0);
    for (const key of VC_BOT_BODY_KEYS) {
      const def = VISUALS[key];
      expect(def, `${key} is not registered`).toBeDefined();
      // The complaint included bodies that could not animate: several infernal
      // class bodies ship with ZERO clips. Idle/walk/run are the pitch minimum.
      expect(def.clips.idle, `${key} has no idle`).toBeTruthy();
      expect(def.clips.walk, `${key} has no walk`).toBeTruthy();
      expect(def.clips.run, `${key} has no run`).toBeTruthy();
    }
  });

  it('are disjoint from every realm class body, so no real character is mistaken for a bot', () => {
    // This disjointness is what lets the bot marker be the body itself instead
    // of a new synced entity flag. If it ever stops holding, this fails loudly
    // and the marker has to become a real field.
    const realms: RealmId[] = [
      'crypticrealm',
      'infernal',
      'classic',
      'arcane',
      'dominion',
      'fps',
      'arcadevoid',
      'exchange',
      'claudecraft',
    ];
    for (const realm of realms) {
      for (const cls of ALL_CLASSES) {
        const key = realmClassVisualKey(realm, cls);
        expect(isValeCupBotBody(key), `${realm}/${cls} resolves to a bot body`).toBe(false);
      }
    }
  });

  it('wear their own body even where the operator published a class override', () => {
    // The Infernal shape of the bug: `class:priest` is a violet necromancer
    // with a staff, and the priest bot inherited it.
    setActiveRealmForOffline('infernal' as RealmId);
    setBodyOverrides('infernal', {
      'class:priest': {
        assetUrl:
          '/cr-realms/infernal/realm_infernal_violet_necromancer_necromancer_m_019cb976.glb',
      },
    });
    const botKey = visualKeyFor(player('priest', VC_BOT_BODY_KEYS[0]));
    expect(botKey).toBe(VC_BOT_BODY_KEYS[0]);
    // A REAL priest with the same class must still get the operator's body.
    const realKey = visualKeyFor(player('priest', null));
    expect(realKey).not.toBe(VC_BOT_BODY_KEYS[0]);
    setBodyOverrides('infernal', {});
    setActiveRealmForOffline(null);
  });

  it('play empty-handed', () => {
    for (const key of VC_BOT_BODY_KEYS) {
      const e = player('warrior', key);
      expect(isValeCupBotBody(e.visualKey)).toBe(true);
      // Only the generated bodies carry a default layout to suppress; assert
      // the suppression fires wherever there is one to suppress.
      if (GENERATED_VISUALS[key]?.attach?.length) {
        expect(forcedHeldLayoutFor(e, key)?.attach).toBeUndefined();
      }
    }
  });
});

describe('Vale Cup bots in a real sim', () => {
  it('every spawned bot carries a villager body, not its class body', () => {
    // End-to-end through spawnCupBot: stage the idle bot-vs-bot exhibition and
    // read the entities the sim actually built. Before the fix these carried a
    // null visualKey and fell through to `class:<cls>`.
    const sim = makeWorld({ noPlayer: false, playerName: 'Watcher' });
    (sim as unknown as { cfg: { valeCupShowcase: boolean } }).cfg.valeCupShowcase = true;
    for (let i = 0; i < 20 * 60 + 2 && !sim.vcup.match; i++) sim.tick();
    expect(sim.vcup.match).toBeTruthy();
    expect(sim.vcup.botPids.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const pid of sim.vcup.botPids) {
      const e = sim.entities.get(pid);
      expect(e, `bot ${pid} missing`).toBeTruthy();
      expect(isValeCupBotBody(e?.visualKey), `bot ${pid} vk=${e?.visualKey}`).toBe(true);
      seen.add(e?.visualKey as string);
    }
    // Cycled by spawn order, so a six-bot exhibition shows the whole rotation
    // rather than six clones of one body.
    expect(seen.size).toBe(Math.min(VC_BOT_BODY_KEYS.length, sim.vcup.botPids.length));
  });
});
