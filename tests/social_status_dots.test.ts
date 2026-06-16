// #100 — the social presence dot is colored purely by a CSS class derived from
// the player's status ('online' | 'combat' | 'dungeon' | 'dead'). A regression
// once shipped where the green rule was named `.soc-dot.on` while the client
// emitted `soc-dot online`, so every online player showed a grey dot. This
// guards the JS<->CSS contract: every status the client can render must have a
// matching `.soc-dot.<status>` rule.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const hud = readFileSync(join(root, 'src/ui/hud.ts'), 'utf8');

// the online presence statuses the server sends and the client turns into a dot class
const ONLINE_STATUSES = ['online', 'combat', 'dungeon', 'dead'];

describe('social presence dot styling (#100)', () => {
  it('every online status has a matching .soc-dot CSS color rule', () => {
    for (const status of ONLINE_STATUSES) {
      expect(indexHtml, `missing CSS rule .soc-dot.${status}`).toContain(`.soc-dot.${status}`);
    }
  });

  it('the dead-but-stale .soc-dot.on rule (which never matched) is gone', () => {
    expect(indexHtml).not.toMatch(/\.soc-dot\.on\b/);
  });

  it('the client still renders the dot class from the status value (offline => no status class)', () => {
    // guards the source line that builds the class, so the contract above stays meaningful
    expect(hud).toContain("dot === 'off' ? '' : dot");
  });
});
