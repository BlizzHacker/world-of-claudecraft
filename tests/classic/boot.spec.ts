// @vitest-environment jsdom
// Regression for the production boot crash: ClassicCrypticMount passed the
// React ref WRAPPER `{ current: saved }` as the engine's `saveData` arg. The
// engine does `if (saveData) this.player = saveData.player` — a `{current:null}`
// wrapper is truthy, so this.player became undefined and the constructor threw
// "Cannot read properties of undefined (reading 'skillRanks')" on Play.
// The 6th constructor arg must be the UNWRAPPED save (null for a fresh game).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

const ctorCalls: any[] = [];
vi.mock('../../src/classic/engine/CrypticRealmGame.js', () => ({
  CrypticRealmGame: class {
    constructor(...args: any[]) { ctorCalls.push(args); }
    destroy() {}
  },
  CR_CLASSES: { ember_witch: { name: 'Ember Witch' } },
  CR_CLASS_ORDER: ['ember_witch'],
  CR_ACTS: [{ id: 1, name: 'Act I' }],
}));

import ClassicCrypticMount from '../../src/classic/ClassicCrypticMount.jsx';

describe('ClassicCrypticMount boot', () => {
  beforeEach(() => { ctorCalls.length = 0; localStorage.clear(); });

  it('passes the unwrapped save (null for fresh) as the 6th constructor arg', () => {
    render(React.createElement(ClassicCrypticMount, { onExit: () => {} }));
    act(() => { screen.getByRole('button', { name: /play/i }).click(); });
    expect(ctorCalls.length).toBe(1);
    const saveArg = ctorCalls[0][5];
    // Fresh game → null/undefined so the engine builds a default player.
    // (A {current:null} ref wrapper would be a non-null object and crash boot.)
    expect(saveArg == null).toBe(true);
  });

  it('passes a stored save object through unwrapped', () => {
    localStorage.setItem('cr_classic_save', JSON.stringify({ player: { name: 'Hero' } }));
    render(React.createElement(ClassicCrypticMount, { onExit: () => {} }));
    act(() => { screen.getByRole('button', { name: /play/i }).click(); });
    const saveArg = ctorCalls[0][5];
    expect(saveArg).not.toHaveProperty('current');
    expect(saveArg.player.name).toBe('Hero');
  });
});
