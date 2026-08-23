import { describe, expect, it } from 'vitest';
import { classifyDecor, FIGURE_WORDS } from '../scripts/realm_assets/emit_decor.mjs';
import {
  DECOR_BUILDING_ROLES,
  DECOR_FIGURE_WORDS,
  decorKeyNamesFigure,
  decorKeySlugWords,
  decorRoleAdmitted,
} from '../src/sim/decor_figure_gate';
import { REALM_DECOR_THEME, realmDecorCandidates } from '../src/sim/realm_decor';
import { REALM_DECOR_CATALOG } from '../src/sim/realm_decor.generated';
import { WORLD_SEED } from '../src/sim/world_seed';

// The live-world defect: an ENORMOUS coated humanoid in a wide-brimmed hat
// standing on the Martyrspike ridge of the infernal realm, several times taller
// than the buildings under it. It is a gaunt-revenant GLB the store filed under
// its `buildings` bucket, so the auto-decoration catalogue gave it the
// `structure` role and the placer scaled it to the 11-yard BUILDING band.
//
// These rows are the reported figure. They are pinned by key because the whole
// point of the fix is that this exact art can never take a building's height
// again, whatever a future catalogue regen decides to call it.
const GIANT_FIGURE_KEYS = [
  'realm:infernal/buildings/gaunt_revenant_the_object_features_a_hum_01944c9f',
  'realm:infernal/buildings/gaunt_revenant_the_object_features_a_hum_019450ce',
  'realm:infernal/buildings/gaunt_revenant_the_object_features_a_hum_019450cf',
  'realm:infernal/buildings/gaunt_revenant_the_object_features_a_hum_019450d2',
];

describe('a figure never takes a building role', () => {
  it('places no building-scaled humanoid in any decorating realm', () => {
    for (const realm of Object.keys(REALM_DECOR_THEME)) {
      for (const p of realmDecorCandidates(realm, WORLD_SEED, REALM_DECOR_CATALOG)) {
        if (!DECOR_BUILDING_ROLES.has(p.role)) continue;
        expect(
          decorKeyNamesFigure(p.key),
          `${realm} stood ${p.key} at ${p.height.toFixed(1)} yards under the building role`,
        ).toBe(false);
      }
    }
  });

  it('never places the reported Martyrspike figure at all', () => {
    const placed = new Set(
      Object.keys(REALM_DECOR_THEME).flatMap((realm) =>
        realmDecorCandidates(realm, WORLD_SEED, REALM_DECOR_CATALOG).map((p) => p.key),
      ),
    );
    for (const key of GIANT_FIGURE_KEYS) expect(placed.has(key)).toBe(false);
  });

  it('refuses a figure the building role and admits it every other role', () => {
    for (const key of GIANT_FIGURE_KEYS) {
      expect(decorRoleAdmitted(key, 'structure')).toBe(false);
      expect(decorRoleAdmitted(key, 'monument')).toBe(true);
      expect(decorRoleAdmitted(key, 'camp')).toBe(true);
    }
    // A statue of a warrior is decoration; a warrior scaled to a house is a bug.
    expect(decorRoleAdmitted('realm:classic/props/orc_warrior_statue_0194de4a', 'monument')).toBe(
      true,
    );
    // The gold rotunda a reviewer corrected off its misleading slug keeps its
    // monument band (the gate never reaches a non-building role).
    expect(
      decorRoleAdmitted('realm:exchange/props/gaunt_revenant_written_in_gold_0193ea7d', 'monument'),
    ).toBe(true);
    // Real buildings whose slugs merely CONTAIN a figure word as a substring.
    for (const key of [
      'realm:classic/buildings/abandoned_manor_019a5964',
      'realm:arcane/buildings/mystical_manor_019b419b',
      'realm:classic/buildings/skull_fortress_019a2beb',
      'realm:classic/buildings/stone_sentinel_tower_x_karama_019b1d3d',
      'realm:classic/buildings/fortress_sentinel_019aa857',
    ]) {
      expect(decorRoleAdmitted(key, 'structure'), key).toBe(true);
    }
  });

  it('word-matches the slug, never a substring', () => {
    expect(decorKeySlugWords('realm:classic/buildings/abandoned_manor_019a5964')).toEqual([
      'abandoned',
      'manor',
    ]);
    // the 48-character store truncation that hid the humanoid in the slug
    expect(
      decorKeySlugWords(
        'realm:infernal/buildings/gaunt_revenant_the_object_features_a_hum_019450cf',
      ),
    ).toEqual(['gaunt', 'revenant', 'the', 'object', 'features', 'a', 'hum']);
  });

  it('costs the shipped catalogue exactly the reported rows and nothing else', () => {
    const refused: string[] = [];
    for (const rows of Object.values(REALM_DECOR_CATALOG)) {
      for (const row of rows) {
        if (!decorRoleAdmitted(row.key, row.role)) refused.push(row.key);
      }
    }
    expect(refused.sort()).toEqual([...GIANT_FIGURE_KEYS].sort());
  });
});

describe('the generator mirrors the gate', () => {
  it('carries the same figure vocabulary', () => {
    expect([...FIGURE_WORDS].sort()).toEqual([...DECOR_FIGURE_WORDS].sort());
  });

  it('refuses to catalogue a figure out of the building bucket', () => {
    expect(
      classifyDecor('gaunt_revenant_the_object_features_a_hum_019450cf', 'building_structure'),
    ).toBeNull();
    // an ordinary building out of the same bucket still catalogues
    expect(classifyDecor('ivied_fortress_019aac41', 'building_structure')).toBe('structure');
    // a figure filed under props still reaches its statue role by vocabulary
    expect(classifyDecor('orc_warrior_statue_0194de4a', 'scenery_prop')).toBe('monument');
  });
});
