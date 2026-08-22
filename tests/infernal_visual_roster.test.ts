import { describe, expect, it } from 'vitest';
import {
  CIVILIAN_FEMALE_VISUAL_KEYS,
  CIVILIAN_MALE_VISUAL_KEYS,
  CIVILIAN_VISUAL_KEYS,
  infernalNpcVisualKey,
  infernalOpponentVisualKey,
  infernalUndeadVisualKey,
} from '../src/render/characters/infernal_roster';
import { VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { npcStructureVisualKey } from '../src/render/npc_structures';
import { MOBS, NPCS } from '../src/sim/data';
import { realmClassVisualKey } from '../src/sim/realms/class_visuals';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import type { PlayerClass } from '../src/sim/types';

/** The one role-only body: named by the militia pins, never drawn by the hash. */
const TOWN_GUARD_KEY = 'realm_infernal_hero_crusader';

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

    // The condemned bank is gone and the bank is now eight reviewed bodies in
    // one art family, so the starter cast no longer collapses onto three
    // repeated men.
    expect(new Set(keys).size).toBeGreaterThanOrEqual(5);
    for (const key of keys) {
      // The two rotations plus the one role-only body, the guard, kept out of
      // the hash on purpose so she never lands on a random villager but is
      // legitimately named by the role pins.
      expect([...CIVILIAN_VISUAL_KEYS, TOWN_GUARD_KEY], key).toContain(key);
      // A KayKit stand-in or a species body would be the regression. This is a
      // NAME test, so it matches whole key SEGMENTS, never substrings: the bank
      // contains realm_infernal_male_s-orc-erer, and a bare /orc/ reads that as
      // an orc. It also has to name its one real exception:
      // realm_infernal_hero_demon_hunter is a hunter OF demons, a reviewed
      // human in a hooded coat, the same "the word is the quarry, not the
      // species" case the class roster already carries for the Demon Hunter.
      expect(key).not.toMatch(/^npc_|(?:^|_)(?:elf|orc)(?:_|$)/i);
      if (key !== 'realm_infernal_hero_demon_hunter') {
        expect(key).not.toMatch(/(?:^|_)demon(?:_|$)/i);
      }
    }
    // Brother Aldric recurs in every hub under suffixed ids, so he is pinned by
    // prefix rather than hashed - one recognisable man across all of them. He is
    // a brother, so he wears the cloister body.
    expect(infernalNpcVisualKey('brother_aldric_raid')).toBe('realm_infernal_hero_monk');
    // An id nobody has pinned still lands on a real townsperson.
    expect([...CIVILIAN_VISUAL_KEYS]).toContain(infernalNpcVisualKey('a_future_infernal_civilian'));
  });

  // The bank is split by gender because rendezvous hashing distributes blind:
  // one mixed rotation put a man on Widow Tansy and left Huntsman Deral in a
  // gown. The router reads the authored display name, never the template id and
  // never the asset filename.
  it('never draws a male-named NPC from the female rotation, or the reverse', () => {
    const male = new Set<string>(CIVILIAN_MALE_VISUAL_KEYS);
    const female = new Set<string>(CIVILIAN_FEMALE_VISUAL_KEYS);

    for (const [id, name] of [
      ['huntsman_deral', 'Huntsman Deral'],
      ['cainhurst_sage', 'Cainhurst the Sage'],
      ['chronicler_saul', 'Saul the Chronicler'],
      ['keeper_bram', 'Keeper Bram'],
      ['mender_saul', 'Mender Saul'],
      ['tanner_hesk', 'Tanner Hesk'],
      ['bursar_aldous_crane', 'Bursar Aldous Crane'],
    ] as const) {
      const key = infernalNpcVisualKey(id, name);
      expect(female.has(key), `${name} -> ${key}`).toBe(false);
    }

    for (const [id, name] of [
      ['widow_tansy', 'Widow Tansy'],
      ['pearlmother_isha', 'Pearl-Mother Isha'],
      ['wickmother_sorrel', 'Wickmother Sorrel'],
      ['forgemistress_darva', 'Forgemistress Darva'],
      ['mother_sedge', 'Mother Sedge'],
    ] as const) {
      const key = infernalNpcVisualKey(id, name);
      expect(male.has(key), `${name} -> ${key}`).toBe(false);
    }

    // A name that asserts nothing draws from the WHOLE bank, which is what
    // shipped before the split and cannot be wrong in a way the data supports.
    const neutral = infernalNpcVisualKey('bellkeeper_tam', 'Bellkeeper Tam');
    expect([...CIVILIAN_VISUAL_KEYS]).toContain(neutral);

    // And the router must not be reading the template id: the same id with the
    // opposite name has to move.
    expect(infernalNpcVisualKey('same_id', 'Widow Tansy')).not.toBe(
      infernalNpcVisualKey('same_id', 'Brother Tansy'),
    );
  });

  // A signboard is not a person. Both templates are NPC entities only so they
  // can carry a nameplate and quest ids; the world draws them as ground props.
  it('gives the two structure templates their prop, not a townsperson', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'crypticrealm' : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });
    const civilians = new Set<string>([...CIVILIAN_VISUAL_KEYS, TOWN_GUARD_KEY]);
    for (const templateId of ['town_defense_board', 'skirmish_post'] as const) {
      const key = visualKeyFor({ kind: 'npc', templateId } as never);
      expect(key, templateId).toBe(npcStructureVisualKey(templateId));
      expect(civilians.has(key), `${templateId} -> ${key}`).toBe(false);
      expect(VISUALS[key], key).toBeTruthy();
    }
    setRealmHostEnv(null);
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
      // The condemned bank is gone (docs/condemned-body-bank.md). The pool is
      // the two civilian rotations plus the one role-only body the pins may
      // name, the guard, kept out of the hash so she never lands on a random
      // villager. Membership is asserted against the EXPORTED lists rather
      // than a key-name regex: the bank is deliberately half realm_infernal_
      // now (the male bodies are the townswomen's own generation siblings), and
      // a name pattern would have to be widened every time the bank moves.
      const pool = new Set<string>([...CIVILIAN_VISUAL_KEYS, TOWN_GUARD_KEY]);
      for (const templateId of Object.keys(NPCS)) {
        // The two NPC templates that are furniture resolve to their own prop
        // and are not civilians at all (src/render/npc_structures.ts).
        if (npcStructureVisualKey(templateId)) continue;
        const key = visualKeyFor({ kind: 'npc', templateId } as never);
        expect(pool.has(key), `${realm}:${templateId} -> ${key}`).toBe(true);
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
