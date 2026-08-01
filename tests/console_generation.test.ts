import { describe, expect, it } from 'vitest';
import {
  consoleGenerationFrom,
  consoleNeedsConstrainedMemory,
} from '../src/game/console_generation';

describe('consoleGenerationFrom', () => {
  it('reads the shell stamp for each generation', () => {
    expect(consoleGenerationFrom('Xbox Series X')).toBe('xbox-series');
    expect(consoleGenerationFrom('Xbox Series S')).toBe('xbox-series');
    expect(consoleGenerationFrom('Xbox One X')).toBe('xbox-one');
    expect(consoleGenerationFrom('Xbox One S')).toBe('xbox-one');
  });

  it('is null when the shell did not stamp anything', () => {
    expect(consoleGenerationFrom(null)).toBeNull();
    expect(consoleGenerationFrom(undefined)).toBeNull();
    expect(consoleGenerationFrom('')).toBeNull();
    expect(consoleGenerationFrom('some desktop')).toBeNull();
  });
});

describe('consoleNeedsConstrainedMemory', () => {
  // The whole point of separating the generations: a Series X must NOT be
  // pinned to the phone-class budget the Xbox One needs.
  it('gives Series the normal budget', () => {
    expect(consoleNeedsConstrainedMemory('xbox-series', true)).toBe(false);
  });

  it('keeps Xbox One constrained', () => {
    expect(consoleNeedsConstrainedMemory('xbox-one', true)).toBe(true);
  });

  // Unstamped console browser: cautious, because being too generous crashes.
  it('is cautious when the console model is unknown', () => {
    expect(consoleNeedsConstrainedMemory(null, true)).toBe(true);
  });

  it('leaves non-console browsers alone', () => {
    expect(consoleNeedsConstrainedMemory(null, false)).toBe(false);
  });
});
