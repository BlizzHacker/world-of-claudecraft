// Phone-viewport pass over the downloads page grids (src/ui/cryptic/download_launchers.ts
// renders into #download-view). Its OWN browser file because it needs the Cryptic
// site sheet (src/ui/cryptic/theme.css), which is UNLAYERED and would out-rank the
// layered game barrel for any shared selector if it were imported beside the HUD
// cases in mobile_phone_surfaces.browser.test.ts.
//
// Rendered geometry, not CSS text: an auto-fill track whose minimum cannot collapse
// still LOOKS correct in the source and still overflows a narrow container.

import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { STORE_LISTINGS, storeCardHtml } from '../../src/ui/cryptic/download_launchers';
import '../../src/ui/cryptic/theme.css';

const TOUCH_FLOOR = 40;
const EPSILON = 0.5;

// The download panel's inner width on the two narrow phones that reach it: a 320px
// screen leaves 288px inside .parchment-panel, a 390px screen leaves 358px. Both of
// those already cleared the old bare 280px/200px track minima, with 8px to spare on
// the narrower one, so 240 is the case with TEETH: a container under the track
// minimum is exactly what a bare minmax() minimum refuses to collapse for, and it is
// what a display-zoom accessibility setting or one more wrapper of padding produces.
const PANEL_WIDTHS = [240, 288, 358];

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.className = 'mobile-touch';
});

function panel(width: number): HTMLElement {
  const box = document.createElement('div');
  box.style.width = `${width}px`;
  document.body.appendChild(box);
  return box;
}

describe('downloads page grids fit a narrow phone panel', () => {
  for (const width of PANEL_WIDTHS) {
    it(`store listings row stays inside a ${width}px panel`, async () => {
      await page.viewport(390, 844);
      const box = panel(width);
      const row = document.createElement('div');
      row.className = 'cr-dl-stores-row';
      row.innerHTML = STORE_LISTINGS.map(storeCardHtml).join('');
      box.appendChild(row);

      expect(
        row.scrollWidth,
        `store row content ${row.scrollWidth} overflows its ${row.clientWidth}px panel`,
      ).toBeLessThanOrEqual(row.clientWidth + EPSILON);
      const rowBox = row.getBoundingClientRect();
      for (const card of Array.from(row.children) as HTMLElement[]) {
        const cardBox = card.getBoundingClientRect();
        expect(cardBox.right).toBeLessThanOrEqual(rowBox.right + EPSILON);
        expect(
          cardBox.height,
          `store badge "${card.textContent?.trim()}" height ${cardBox.height}`,
        ).toBeGreaterThanOrEqual(TOUCH_FLOOR - EPSILON);
      }
    });

    it(`launcher card grid stays inside a ${width}px panel`, async () => {
      await page.viewport(390, 844);
      const box = panel(width);
      const grid = document.createElement('div');
      grid.className = 'cr-dl-grid';
      grid.innerHTML = `
        <div class="cr-dl-card">
          <div class="cr-dl-header"><span class="cr-dl-icon">WIN</span><strong>Windows 10/11</strong></div>
          <div class="cr-dl-row">
            <a class="cr-dl-btn" href="/downloads/lite.exe"><span>Download Lite</span><small>90 MB</small></a>
            <a class="cr-dl-btn cr-dl-track" href="/downloads/heavy.exe"><span>Download Heavy</span><small>1.4 GB</small></a>
          </div>
          <div class="cr-dl-pending">Windows Alpha builds are unsigned for now.</div>
        </div>`;
      box.appendChild(grid);

      expect(
        grid.scrollWidth,
        `launcher grid content ${grid.scrollWidth} overflows its ${grid.clientWidth}px panel`,
      ).toBeLessThanOrEqual(grid.clientWidth + EPSILON);
      const gridBox = grid.getBoundingClientRect();
      for (const button of Array.from(grid.querySelectorAll('.cr-dl-btn')) as HTMLElement[]) {
        const b = button.getBoundingClientRect();
        expect(b.right).toBeLessThanOrEqual(gridBox.right + EPSILON);
        expect(b.height, `download button height ${b.height}`).toBeGreaterThanOrEqual(
          TOUCH_FLOOR - EPSILON,
        );
      }
    });
  }
});
