import { describe, expect, it } from 'vitest';
import { isXboxConsole } from '../src/game/xbox_env';

describe('xbox_env', () => {
  it('detects the Xbox Edge user agent', () => {
    expect(
      isXboxConsole(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series X) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edge/124.0',
      ),
    ).toBe(true);
  });

  it('does not flag desktop or mobile browsers', () => {
    for (const ua of [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0',
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Safari/537.36',
      '',
    ]) {
      expect(isXboxConsole(ua)).toBe(false);
    }
  });
});
