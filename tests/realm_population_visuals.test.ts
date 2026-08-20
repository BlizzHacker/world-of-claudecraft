import { afterEach, describe, expect, it } from 'vitest';
import { VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { MOBS, NPCS } from '../src/sim/data';
import { setRealmHostEnv } from '../src/sim/realms/registry';

const REALMS = [
  'crypticrealm',
  'infernal',
  'classic',
  'dominion',
  'arcane',
  'arcadevoid',
  'fps',
  'exchange',
] as const;

function useRealm(realm: (typeof REALMS)[number]): void {
  setRealmHostEnv({
    queryParam: (name) => (name === 'realm' ? realm : null),
    storageGet: () => null,
    storageSet: () => undefined,
  });
}

describe('non-Claudecraft realm populations', () => {
  afterEach(() => setRealmHostEnv(null));

  it('renders every NPC on an authored non-KayKit body', () => {
    for (const realm of REALMS) {
      useRealm(realm);
      for (const templateId of Object.keys(NPCS)) {
        const key = visualKeyFor({ kind: 'npc', templateId } as never);
        const visual = VISUALS[key];
        expect(key, `${realm}:${templateId}`).toMatch(/^realm_/);
        expect(key, `${realm}:${templateId}`).not.toMatch(/^npc_|^player_/);
        expect(visual, `${realm}:${templateId}:${key}`).toBeTruthy();
        expect(visual.url, `${realm}:${templateId}:${key}`).toMatch(/^\/cr-realms\/.+\.glb$/);
      }
    }
  });

  it('keeps humanoid-shaped enemies off stock player, NPC, and mob bodies', () => {
    for (const realm of REALMS) {
      useRealm(realm);
      for (const [templateId, mob] of Object.entries(MOBS)) {
        if (!['humanoid', 'undead', 'demon', 'troll', 'ogre'].includes(mob.family)) continue;
        const key = visualKeyFor({ kind: 'mob', templateId } as never);
        if (templateId === 'training_dummy') {
          expect(key).toBe('mob_training_dummy');
          continue;
        }
        const visual = VISUALS[key];
        expect(key, `${realm}:${templateId}`).not.toMatch(
          /^(?:player|npc)_|^mob_(?:bandit|bruiser|dark_caster|villager)|^delve_mob_acolyte$/,
        );
        expect(visual, `${realm}:${templateId}:${key}`).toBeTruthy();
        if (realm === 'crypticrealm') {
          expect(visual.url, `${realm}:${templateId}:${key}`).toMatch(
            /^(?:\/cr-realms\/.+|models\/(?:chars\/enemies|creatures)\/.+)\.glb$/,
          );
        } else if (realm === 'infernal') {
          expect(visual.url, `${realm}:${templateId}:${key}`).toMatch(
            /^(?:\/cr-realms\/.+|models\/chars\/enemies\/.+)\.glb$/,
          );
        } else if (realm !== 'exchange') {
          expect(visual.url, `${realm}:${templateId}:${key}`).toContain(`/cr-realms/${realm}/`);
        } else {
          expect(visual.url, `${realm}:${templateId}:${key}`).toMatch(/^\/cr-realms\/.+\.glb$/);
        }
      }
    }
  });
});
