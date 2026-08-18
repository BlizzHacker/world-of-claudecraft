// The CLASS half of the realm lore overlay: class names, ability names, talent
// spec names, and the fork tool window titles.
//
// The report this answers: a themed realm's hero read as "Druid" in Talents and
// cast "Moonfire" out of the shared world, because RealmEntityText covered the
// WORLD (zones, cast, quests) and nothing about the CHARACTER. These pins cover
// the three contract points the world half already has - the overlaid realm
// serves the overlay, a realm without one is byte-identical, and an id the
// overlay does not carry falls through - plus the two that are specific to this
// layer: every id written into the overlay is a REAL canonical id (a typo would
// otherwise ship as a silently dead key), and claudecraft stays pristine.

import { afterEach, describe, expect, it } from 'vitest';
import { ABILITIES, CLASSES } from '../src/sim/data';
import { talentsFor } from '../src/sim/content/talents';
import { REALM_CLASS_LORE_WORKLIST } from '../src/sim/realms/content/class_lore';
import {
  CINDERVEIL_ABILITIES,
  CINDERVEIL_CLASSES,
  CINDERVEIL_SYSTEMS,
  CINDERVEIL_TALENT_SPECS,
} from '../src/sim/realms/content/infernal_lore_classes';
import { REALMS, setRealmHostEnv } from '../src/sim/realms/registry';
import { realmSystemTitle } from '../src/sim/realms/system_text';
import type { PlayerClass } from '../src/sim/types';
import { tEntity } from '../src/ui/entity_i18n';
import { t } from '../src/ui/i18n';

function useRealm(id: string): void {
  setRealmHostEnv({
    queryParam: (name) => (name === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}

afterEach(() => setRealmHostEnv(null));

describe('the Cinderveil class layer', () => {
  it('renames the engine class the player is actually running', () => {
    useRealm('infernal');
    // The owner's report: a Skullbeast hero runs the canonical 'druid' class and
    // every window called it Druid.
    expect(tEntity({ kind: 'class', id: 'druid', field: 'name' })).toBe('Forest Sage');
    expect(tEntity({ kind: 'class', id: 'warlock', field: 'name' })).toBe('Bone Herald');
    expect(tEntity({ kind: 'class', id: 'priest', field: 'name' })).toBe('Wakekeeper');
    expect(tEntity({ kind: 'class', id: 'druid', field: 'description' })).toContain('Cinderveil');
  });

  it('renames the skills that read as somebody else s game', () => {
    useRealm('infernal');
    expect(tEntity({ kind: 'ability', id: 'moonfire', field: 'name' })).toBe('Drowned Moonfire');
    expect(tEntity({ kind: 'ability', id: 'bear_form', field: 'name' })).toBe('Barkhide Form');
    expect(tEntity({ kind: 'ability', id: 'flamestrike', field: 'name' })).toBe('Hellfire Cascade');
  });

  it('leaves an ability the overlay does not claim exactly as it was', () => {
    useRealm('infernal');
    // Deliberately absent from the overlay: the earlier rename sweep already put
    // these in the realm's voice, and a sparse overlay is the whole design.
    expect(tEntity({ kind: 'ability', id: 'maul', field: 'name' })).toBe('Bonecrush');
    expect(tEntity({ kind: 'ability', id: 'eviscerate', field: 'name' })).toBe('Dirt Nap');
  });

  it('renames the talent specs, which are the most base-game text in Talents', async () => {
    const { tTalent } = await import('../src/ui/talent_i18n');
    const specOf = (cls: PlayerClass, id: string) =>
      talentsFor(cls)?.specs.find((s) => s.id === id);
    const balance = specOf('druid', 'balance');
    expect(balance).toBeDefined();
    useRealm('infernal');
    if (balance) expect(tTalent({ kind: 'talentSpec', spec: balance, field: 'name' })).toBe('Drowned Moon');
    useRealm('claudecraft');
    if (balance) expect(tTalent({ kind: 'talentSpec', spec: balance, field: 'name' })).toBe('Moongrove');
  });

  it('retitles the built-in windows through the catalog map that already existed', () => {
    useRealm('infernal');
    expect(t('game.talents.title')).toBe('Lineage');
    expect(t('abilityUi.spellbook.title')).toBe('Grimoire');
    expect(t('itemUi.bags.title')).toBe('Satchels');
    expect(t('hudChrome.finder.title')).toBe('The Descent Board');
    useRealm('claudecraft');
    expect(t('game.talents.title')).toBe('Talents');
    expect(t('abilityUi.spellbook.title')).toBe('Spellbook');
  });

  it('retitles the fork tool windows through RealmEntityText.systems', () => {
    useRealm('infernal');
    expect(realmSystemTitle('skillTrees', 'Skill Trees')).toBe('Rites of Descent');
    expect(realmSystemTitle('bestiary', 'Monster Chronicle')).toBe('The Cinder Chronicle');
    useRealm('classic');
    expect(realmSystemTitle('skillTrees', 'Skill Trees')).toBe('Skill Trees');
    expect(realmSystemTitle('bestiary', 'Monster Chronicle')).toBe('Monster Chronicle');
  });
});

describe('realms without a class overlay are untouched', () => {
  it('claudecraft stays pristine upstream: no overlay at all', () => {
    expect(REALMS.claudecraft.entityText).toBeUndefined();
    expect(REALM_CLASS_LORE_WORKLIST.claudecraft.lore).toEqual({});
    useRealm('claudecraft');
    expect(tEntity({ kind: 'class', id: 'druid', field: 'name' })).toBe('Druid');
    expect(tEntity({ kind: 'ability', id: 'moonfire', field: 'name' })).toBe('Lunar Tempest');
  });

  it('another themed realm keeps the canonical class and ability names', () => {
    useRealm('classic');
    expect(tEntity({ kind: 'class', id: 'druid', field: 'name' })).toBe('Druid');
    expect(tEntity({ kind: 'ability', id: 'bear_form', field: 'name' })).toBe('Bruin Form');
  });

  it('the new arms read own properties only, and unknown ids fall through', () => {
    useRealm('infernal');
    // The overlay arms use ownEntry (the R34 discipline), so a wire-supplied
    // prototype key can never pick up a Cinderveil name. What such an id
    // resolves to instead is the CANONICAL arm's business, not this layer's, so
    // that value is deliberately not asserted here.
    expect(tEntity({ kind: 'ability', id: 'constructor', field: 'name' })).not.toBe(
      CINDERVEIL_ABILITIES.moonfire?.name,
    );
    expect(tEntity({ kind: 'ability', id: 'future_ability', field: 'name' })).toBe('future_ability');
    // 'class' takes a typed PlayerClass, so there is no unknown-id case to pin:
    // every id that can reach that arm is one of the nine.
  });
});

describe('every id in the overlay is a real canonical id', () => {
  it('class ids exist in CLASSES', () => {
    for (const id of Object.keys(CINDERVEIL_CLASSES)) {
      expect(Object.hasOwn(CLASSES, id), `class ${id}`).toBe(true);
    }
  });

  it('ability ids exist in ABILITIES', () => {
    const missing = Object.keys(CINDERVEIL_ABILITIES).filter((id) => !Object.hasOwn(ABILITIES, id));
    expect(missing, `unknown ability ids: ${missing.join(', ')}`).toEqual([]);
  });

  it('talent spec keys name a real <class>.<specId> pair', () => {
    const missing = Object.keys(CINDERVEIL_TALENT_SPECS).filter((key) => {
      const [cls, specId] = key.split('.');
      return !talentsFor(cls as PlayerClass)?.specs.some((s) => s.id === specId);
    });
    expect(missing, `unknown spec keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('every named system carries a title', () => {
    for (const [id, title] of Object.entries(CINDERVEIL_SYSTEMS)) {
      expect(typeof title === 'string' && title.length > 0, `system ${id}`).toBe(true);
    }
  });

  it('the worklist covers every realm so no realm is silently forgotten', () => {
    for (const id of Object.keys(REALMS)) {
      expect(Object.hasOwn(REALM_CLASS_LORE_WORKLIST, id), `worklist entry for ${id}`).toBe(true);
    }
  });
});
