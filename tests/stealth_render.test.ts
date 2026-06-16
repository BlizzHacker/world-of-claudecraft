import { describe, expect, it } from 'vitest';
import { shouldRenderStealthGhost } from '../src/render/stealth';

const entity = (overrides: any) => ({
  id: 1,
  kind: 'player',
  auras: [],
  ...overrides,
});

describe('stealth rendering policy', () => {
  it('renders the local stealthed player as a translucent ghost', () => {
    const rogue = entity({ id: 7, auras: [{ kind: 'stealth' }] });
    expect(shouldRenderStealthGhost(7, rogue)).toBe(true);
  });

  it('renders detected stealthed players as translucent ghosts', () => {
    const rogue = entity({ id: 8, auras: [{ kind: 'stealth' }] });
    expect(shouldRenderStealthGhost(7, rogue)).toBe(true);
  });

  it('does not ghost unstealthed players or creatures', () => {
    expect(shouldRenderStealthGhost(7, entity({ id: 8 }))).toBe(false);
    expect(shouldRenderStealthGhost(7, entity({ id: 8, kind: 'mob', auras: [{ kind: 'stealth' }] }))).toBe(false);
  });
});
