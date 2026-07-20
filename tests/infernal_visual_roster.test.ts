import { describe, expect, it } from 'vitest';
import {
  INFERNAL_HUMAN_VISUAL_KEYS,
  infernalNpcVisualKey,
  infernalOpponentVisualKey,
} from '../src/render/characters/infernal_roster';
import { visualKeyFor } from '../src/render/characters/manifest';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import { realmClassVisualKey } from '../src/sim/realms/class_visuals';
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

    expect(new Set(keys).size).toBeGreaterThanOrEqual(7);
    for (const key of keys) {
      expect(INFERNAL_HUMAN_VISUAL_KEYS).toContain(key);
      expect(key).not.toMatch(/npc_|elf|orc|demon/i);
    }
    expect(infernalNpcVisualKey('brother_aldric_raid')).toBe('realm_infernal_human_white_sage');
    expect(infernalNpcVisualKey('a_future_infernal_civilian')).toMatch(/^realm_infernal_human_/);
  });

  it('gives all nine runtime classes distinct human bodies', () => {
    const keys = CLASSES.map((cls) => realmClassVisualKey('Infernal', cls));

    expect(new Set(keys).size).toBe(CLASSES.length);
    for (const key of keys) {
      expect(key).toMatch(/^realm_infernal_human_/);
      expect(key).not.toMatch(/elf|orc|demon/i);
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
    setRealmHostEnv(null);
  });
});
