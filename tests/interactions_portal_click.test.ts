// Clicking a waypoint pylon, a town portal, or an interior exit door must route
// through world.interact() (the sim's server-authoritative dispatcher), exactly
// like the proximity press in nearby_interaction.ts, and must NOT fall through
// to pickUpObject (which would try to pocket the pylon). Out of range the click
// stays a no-op interaction so the caller's approach logic can walk over.

import { describe, expect, it, vi } from 'vitest';
import { handlePickedEntity } from '../src/game/interactions';
import { type Entity, INTERACT_RANGE } from '../src/sim/types';

type World = Parameters<typeof handlePickedEntity>[0];
type HudDeps = Parameters<typeof handlePickedEntity>[1];

function stubObject(id: number, templateId: string, x: number): Entity {
  return {
    id,
    kind: 'object',
    templateId,
    name: templateId,
    pos: { x, y: 0, z: 0 },
    dead: false,
    lootable: true,
    hostile: false,
  } as unknown as Entity;
}

function stubPlayer(): Entity {
  return {
    id: 1,
    kind: 'player',
    templateId: 'player',
    name: 'Tester',
    pos: { x: 0, y: 0, z: 0 },
    dead: false,
  } as unknown as Entity;
}

function makeWorld(object: Entity) {
  const player = stubPlayer();
  const interact = vi.fn();
  const pickUpObject = vi.fn(() => true as const);
  const world = {
    playerId: 1,
    player,
    entities: new Map([
      [1, player],
      [object.id, object],
    ]),
    targetEntity: () => {},
    interact,
    pickUpObject,
  } as unknown as World;
  const hud = {
    closeContextMenu: () => {},
    showError: vi.fn(),
  } as unknown as HudDeps;
  return { world, hud, interact, pickUpObject };
}

const PORTAL_TEMPLATES = ['waypoint', 'town_portal', 'building_exit'] as const;

describe('handlePickedEntity portal-object clicks', () => {
  for (const button of [0, 2] as const) {
    for (const templateId of PORTAL_TEMPLATES) {
      it(`button ${button} on a ${templateId} in range fires interact(), not pickUpObject`, () => {
        const object = stubObject(2, templateId, 2);
        const { world, hud, interact, pickUpObject } = makeWorld(object);
        expect(handlePickedEntity(world, hud, 2, button, 10, 20)).toBe(true);
        expect(interact).toHaveBeenCalledTimes(1);
        expect(pickUpObject).not.toHaveBeenCalled();
      });

      it(`button ${button} on a ${templateId} out of range does nothing`, () => {
        const object = stubObject(2, templateId, INTERACT_RANGE + 10);
        const { world, hud, interact, pickUpObject } = makeWorld(object);
        expect(handlePickedEntity(world, hud, 2, button, 10, 20)).toBe(false);
        expect(interact).not.toHaveBeenCalled();
        expect(pickUpObject).not.toHaveBeenCalled();
      });
    }
  }

  it('an ordinary lootable object still routes to pickUpObject', () => {
    const object = stubObject(2, 'herb_bundle', 2);
    const { world, hud, interact, pickUpObject } = makeWorld(object);
    expect(handlePickedEntity(world, hud, 2, 0, 10, 20)).toBe(true);
    expect(pickUpObject).toHaveBeenCalledWith(2);
    expect(interact).not.toHaveBeenCalled();
  });
});
