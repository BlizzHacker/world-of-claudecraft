// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// engine is heavy/canvas — stub it
vi.mock('../../src/classic/engine/CrypticRealmGame.js', () => ({
  CrypticRealmGame: class { destroy(){} },
  CR_CLASSES: { ember_witch: { name: 'Ember Witch' } },
  CR_CLASS_ORDER: ['ember_witch'],
  CR_ACTS: [{ id: 1, name: 'Act I' }],
}));

import ClassicCrypticMount from '../../src/classic/ClassicCrypticMount.jsx';

describe('ClassicCrypticMount', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  it('renders class select with the back control', () => {
    render(React.createElement(ClassicCrypticMount, { onExit: () => {} }));
    expect(screen.getByText(/Ember Witch/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /back to crypticrealm/i })).toBeTruthy();
  });
});
