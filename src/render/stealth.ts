import type { Entity } from '../sim/types';

export function isStealthed(e: Entity): boolean {
  return e.auras.some((a) => a.kind === 'stealth');
}

export function shouldRenderStealthGhost(viewerId: number, e: Entity): boolean {
  return e.kind === 'player' && isStealthed(e);
}
