import { describe, expect, it } from 'vitest';
import {
  CIVILIAN_VISUAL_KEYS,
  infernalNpcVisualKey,
  infernalOpponentVisualKey,
  infernalUndeadVisualKey,
} from '../src/render/characters/infernal_roster';
import { VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { MOBS, NPCS } from '../src/sim/data';
import { realmClassVisualKey } from '../src/sim/realms/class_visuals';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import type { PlayerClass } from '../src/sim/types';

const STARTER_HUMANS = [
  'the_merchant',
  'marshal_redbrook',
  'trader_wilkes',
  'apothecary_lin',
  'brother_aldric',
  'smith_haldren',
  'fisherman_brandt',
  'foreman_odell',
  'stable_master_wren',
  'mercenary_kael',
  'huntress_verr',
  'bursar_fernando',
  'realtor_maribel',
  'pit_master_grott',
  'race_marshal_pip',
  'groundskeeper_bram',
  'brother_halven',
  'cainhurst_sage',
  'spirit_healer',
  'interior_merchant',
  'interior_innkeeper',
  'interior_villager',
  'skirmish_builder',
  'skirmish_footman',
] as const;

const CLASSES: PlayerClass[] = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
];

describe('Infernal visual roster', () => {
  it('assigns the full starter cast to varied authored humans without KayKit or elves', () => {
    const keys = STARTER_HUMANS.map((id) => infernalNpcVisualKey(id));

    // The condemned bank is gone and the civilian rotation is five reviewed
    // townspeople, so the starter cast no longer collapses onto three repeated
    // men. Held at 4 rather than 5 since the two chibi-headed village elders
    // were rejected on 2026-08-21: the bank is one body smaller and the guard
    // is the only role-only body left.
    expect(new Set(keys).size).toBeGreaterThanOrEqual(4);
    for (const key of keys) {
      // The rotation plus the one role-only body, the guard, kept out of the
      // hash on purpose so she never lands on a random villager but is
      // legitimately named by the role pins.
      expect(
        [...CIVILIAN_VISUAL_KEYS, 'realm_crypticrealm_town_guard_female_armored_019875c0'],
        key,
      ).toContain(key);
      expect(key).not.toMatch(/npc_|elf|orc|demon/i);
    }
    // Brother Aldric recurs in every hub under suffixed ids, so he is pinned by
    // prefix rather than hashed - one recognisable man across all of them.
    expect(infernalNpcVisualKey('brother_aldric_raid')).toBe(
      'realm_crypticrealm_craftsman_warrior_monk_019ee5e1',
    );
    // An id nobody has pinned still lands on a real townsperson.
    expect(infernalNpcVisualKey('a_future_infernal_civilian')).toMatch(
      /^realm_crypticrealm_(village_elder|townsman|townswoman|town_guard|craftsman)_/,
    );
  });

  it('gives all nine runtime classes distinct published full-size bodies', () => {
    const keys = CLASSES.map((cls) => realmClassVisualKey('Infernal', cls));

    expect(new Set(keys).size).toBe(CLASSES.length);
    for (const key of keys) {
      expect(key).toBeTruthy();
      const visual = VISUALS[key!];
      expect(visual, key!).toBeTruthy();
      expect(visual.url, key!).toMatch(/^\/cr-realms\//);
      expect(visual.url, key!).not.toMatch(/kaykit|models\/chars|claudecraft/i);
      // The UNSUFFIXED half of this prefix is the condemned miniature/chibi
      // bank; the `_f` half is the nine reviewed variant bodies that survived
      // the same audit and are legitimately selectable (the rogue is one of
      // them). Infernal may deliberately borrow a proven human body from Cryptic
      // Realm, but it may never fall back to the condemned bank or a stock
      // ClaudeCraft body.
      expect(key, key!).not.toMatch(/^realm_infernal_class_(?!\w+_f$)/);
    }
  });

  it('keeps animals recognizable while replacing hostile humanoids with Infernal opponents', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'infernal' : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });

    expect(visualKeyFor({ kind: 'mob', templateId: 'forest_wolf' } as never)).toBe('mob_wolf');
    expect(visualKeyFor({ kind: 'mob', templateId: 'wild_boar' } as never)).toBe('mob_boar');
    expect(visualKeyFor({ kind: 'mob', templateId: 'brother_aldric_raid' } as never)).toBe(
      infernalOpponentVisualKey('brother_aldric_raid'),
    );
    expect(infernalOpponentVisualKey('brother_aldric_raid')).not.toMatch(/npc_|elf|orc/i);
    expect(infernalOpponentVisualKey('mogger')).toBe('realm_infernal_dark_paladin');
    expect(infernalOpponentVisualKey('vale_bandit')).not.toBe('realm_infernal_dark_paladin');
    setRealmHostEnv(null);
  });

  it('replaces every Infernal and Cryptic civilian template with the full-size human bank', () => {
    for (const realm of ['infernal', 'crypticrealm'] as const) {
      setRealmHostEnv({
        queryParam: (name) => (name === 'realm' ? realm : null),
        storageGet: () => null,
        storageSet: () => undefined,
      });
      const keys = Object.keys(NPCS).map((templateId) =>
        visualKeyFor({ kind: 'npc', templateId } as never),
      );
      // The condemned bank is gone (docs/condemned-body-bank.md). The pool is
      // the eight-body civilian rotation, plus the two role-only bodies the
      // pins may name - a guard and a craftsman, which are deliberately kept
      // out of the hash so they never land on a random villager.
      const pool = new Set<string>([
        ...CIVILIAN_VISUAL_KEYS,
        'realm_crypticrealm_town_guard_female_armored_019875c0',
        'realm_crypticrealm_craftsman_warrior_monk_019ee5e1',
      ]);
      for (const key of new Set(keys)) expect(pool.has(key), `${realm}:${key}`).toBe(true);
      for (const key of keys) {
        expect(key, `${realm}:${key}`).toMatch(
          /^realm_crypticrealm_(village_elder|townsman|townswoman|town_guard|craftsman)_/,
        );
        expect(VISUALS[key], `${realm}:${key}`).toBeTruthy();
      }
    }
    setRealmHostEnv(null);
  });

  it('themes every Infernal creature without turning animals into demons or trolls into orcs', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'infernal' : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });

    const undead = new Set<string>();
    for (const [templateId, mob] of Object.entries(MOBS)) {
      const key = visualKeyFor({ kind: 'mob', templateId } as never);
      expect(VISUALS[key], templateId).toBeTruthy();
      expect(key, templateId).not.toMatch(/^realm_classic_|^npc_|^player_/);
      if (mob.family === 'undead') undead.add(key);
      if (mob.family === 'troll') expect(key, templateId).not.toBe('mob_troll');
      if (mob.family === 'ogre') expect(key, templateId).not.toBe('mob_ogre');
    }
    expect(visualKeyFor({ kind: 'mob', templateId: 'training_dummy' } as never)).toBe(
      'mob_training_dummy',
    );
    expect(undead.size).toBeGreaterThanOrEqual(5);
    expect(infernalUndeadVisualKey('restless_bones')).toBe('realm_cryptic_bone_herald');
    setRealmHostEnv(null);
  });

  it('uses a varied undead bank throughout Cryptic Realm', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'crypticrealm' : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });
    const keys = Object.entries(MOBS)
      .filter(([, mob]) => mob.family === 'undead')
      .map(([templateId]) => visualKeyFor({ kind: 'mob', templateId } as never));

    expect(new Set(keys).size).toBeGreaterThanOrEqual(5);
    expect(keys).toContain('realm_cryptic_bone_herald');
    for (const key of keys) expect(VISUALS[key], key).toBeTruthy();
    setRealmHostEnv(null);
  });
});
