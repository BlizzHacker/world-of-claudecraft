// NPCs that render as static props must never roam.
//
// sim.ts opts every NPC into roaming by default (`npc.roams = npcDef.roams ?? !npcDef.market`).
// That is correct for people and wrong for the entries in NPC_STRUCTURE_OBJECT_IDS, which the
// renderer draws as ground props (buildGroundQuestObject), not characters: the Town Defense
// Board was measured strolling 2.17 yards over 2000 ticks before this was pinned.
//
// This guards the class, not just the two known ids: add a structure NPC without
// `roams: false` and this fails.
import { describe, expect, it, afterEach } from 'vitest';
import { NPCS } from '../src/sim/data';
import { Sim } from '../src/sim/sim';
import { NPC_STRUCTURE_OBJECT_IDS } from '../src/render/npc_structures';
import { setRealmHostEnv } from '../src/sim/realms/registry';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

describe('static structure NPCs', () => {
  it('declare roams: false so the sim default cannot make them walk', () => {
    for (const templateId of Object.keys(NPC_STRUCTURE_OBJECT_IDS)) {
      const def = NPCS[templateId];
      expect(def, `${templateId} missing from NPCS`).toBeTruthy();
      expect(def.roams, `${templateId} must declare roams: false`).toBe(false);
    }
  });

  it('the Town Defense Board holds its exact spawn position in a live sim', () => {
    forceRealm('infernal');
    const sim = new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
    const board = [...sim.entities.values()].find((e) => e.templateId === 'town_defense_board');
    expect(board, 'town_defense_board not spawned on infernal').toBeTruthy();
    expect(board!.roams).toBe(false);

    const start = { x: board!.pos.x, z: board!.pos.z };
    for (let i = 0; i < 2000; i++) sim.tick();
    const drift = Math.hypot(board!.pos.x - start.x, board!.pos.z - start.z);
    expect(drift).toBe(0);
  });
});
