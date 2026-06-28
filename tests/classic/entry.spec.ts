// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
vi.mock('../../src/classic/ClassicCrypticMount.jsx', () => ({
  default: ({ onExit }: { onExit: () => void }) =>
    (require('react').createElement('div', { 'data-cr-mounted': true })),
}));
import { mountClassic, unmountClassic } from '../../src/classic/classic-entry';

describe('classic-entry', () => {
  it('mounts and unmounts on a host element', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    act(() => { mountClassic(host); });
    expect(host.querySelector('[data-cr-mounted]')).toBeTruthy();
    act(() => { unmountClassic(); });
    expect(host.querySelector('[data-cr-mounted]')).toBeFalsy();
  });
});
