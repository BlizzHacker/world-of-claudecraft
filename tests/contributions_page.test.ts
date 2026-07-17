import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'public/contributions.html'), 'utf8');

describe('public contributions feed', () => {
  it('does not leave stale receipts visible when the live feed is empty or unavailable', () => {
    expect(page).toContain("className: 'feed-empty'");
    expect(page).toContain("className: 'feed-error'");
    expect(page).toContain('no stale receipts are shown');
    expect(page).not.toContain('static receipts remain visible');
  });
});
