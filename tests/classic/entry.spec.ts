// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/classic/ClassicCrypticMount.jsx', () => ({
  default: ({ onExit }: { onExit: () => void }) =>
    // minimal stand-in element
    (require('react').createElement('div', { 'data-cr-mounted': true })),
}));
import { mountClassic, unmountClassic } from '../../src/classic/classic-entry';

describe('classic-entry', () => {
  it('mounts and unmounts on a host element', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    mountClassic(host);
    await Promise.resolve();
    expect(host.querySelector('[data-cr-mounted]')).toBeTruthy();
    unmountClassic();
    await Promise.resolve();
    expect(host.querySelector('[data-cr-mounted]')).toBeFalsy();
  });
});
