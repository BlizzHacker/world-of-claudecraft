import { describe, expect, it } from 'vitest';
import { ClientWorld } from '../src/net/online';
import { Sim } from '../src/sim/sim';
import type { IWorld } from '../src/world_api';

describe('appearance skin selection', () => {
  it('updates offline player skin through the world contract', () => {
    const sim = new Sim({ seed: 1, playerClass: 'druid', playerName: 'Skintest' });
    const world: IWorld = sim;

    world.changeSkin(3);

    expect(sim.player.skin).toBe(3);
    // persistence is a Sim-concrete concern, not part of the IWorld seam
    expect(sim.serializeCharacter(sim.playerId)?.skin).toBe(3);
  });

  it('sends the online skin change command and mirrors the local player immediately', () => {
    const sent: unknown[] = [];
    const client: ClientWorld = Object.create(ClientWorld.prototype);
    Object.assign(client, {
      connected: true,
      ws: { readyState: 1, send: (raw: string) => sent.push(JSON.parse(raw)) },
      playerId: 7,
      entities: new Map([[7, { id: 7, skin: 0 }]]),
    });
    (globalThis as any).WebSocket = { OPEN: 1 };

    client.changeSkin(2);

    expect(client.player.skin).toBe(2);
    expect(sent).toEqual([{ t: 'cmd', cmd: 'change_skin', skin: 2 }]);
  });
});
