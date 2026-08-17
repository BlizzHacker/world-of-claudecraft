// @vitest-environment happy-dom
//
// The offline creator's ACTION ROW must never live inside the form's scroll
// region.
//
// #offline-select is a fixed-height card (>=900px: `height: min(640px, 100vh -
// 190px)`, `overflow: hidden`). Its left column used to be one flow - name,
// realm picker, class grid, appearance customizer, Enter World / Back - so
// every pixel the form grew was taken off the END of that flow, and the end is
// where the actions are. Painting the Infernal hero roster into this host
// (18+ cards, a 560px scroller, in place of a 140px nine-button grid) took the
// form to ~990px inside a ~486px column: the appearance editor and BOTH
// buttons rendered 300-550px below the card, invisible and unclickable, and
// the panel could not be completed at all. It was already ~118px over on the
// plain realms, so this is not a roster-only property.
//
// The fix is structural, so the pin is structural: the buttons are in a
// .auth-actions that is a SIBLING of .cs-offline-flow, never a descendant. A
// future roster, a taller realm picker or a longer appearance tab can then
// only ever change what the region scrolls, never where the footer sits.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// happy-dom gives this file a DOMParser, but it also leaves import.meta.url a
// non-file URL, so the sources are read from the vitest root instead.
const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

const html = read('index.html');
const shellCss = read('src/styles/shell.css');

// Strip the sub-resources before parsing: happy-dom would otherwise try to
// FETCH every <link>/<script> in the page off a dev server that is not running
// during a unit run. Nothing below asserts on either tag.
const inertHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, '');
const doc = new DOMParser().parseFromString(inertHtml, 'text/html');
const panel = doc.querySelector('#offline-select');
const flow = doc.querySelector('#offline-select .cs-offline-flow');

describe('offline creator: the action row is outside the scroll region', () => {
  it('parses the panel and its scroll region out of index.html', () => {
    expect(panel).not.toBeNull();
    expect(flow).not.toBeNull();
  });

  it('keeps Enter World and Back OUT of the scrolling region', () => {
    const enter = doc.querySelector('#btn-start-offline');
    const back = doc.querySelector('#btn-offline-back');
    expect(enter).not.toBeNull();
    expect(back).not.toBeNull();
    // The whole point: nothing the region scrolls can move these.
    expect(flow?.contains(enter as Node)).toBe(false);
    expect(flow?.contains(back as Node)).toBe(false);
  });

  it('makes the action row a following SIBLING of the region, both direct children of .char-create', () => {
    const form = doc.querySelector('#offline-select .char-create');
    const actions = doc.querySelector('#offline-select .auth-actions');
    expect(actions).not.toBeNull();
    expect(actions?.parentElement).toBe(form);
    expect(flow?.parentElement).toBe(form);
    const kids = [...(form?.children ?? [])];
    expect(kids.indexOf(flow as Element)).toBeLessThan(kids.indexOf(actions as Element));
  });

  it('puts every row that can grow INSIDE the region', () => {
    // The class/hero grid is the row the roster paint replaces wholesale, and
    // the appearance customizer is the other unbounded one. Both must scroll.
    for (const sel of [
      '#offline-realm-row',
      '.mini-class-row',
      '#offline-skin-row',
      '#offline-appearance',
    ]) {
      const el = doc.querySelector(`#offline-select ${sel}`);
      expect(el, sel).not.toBeNull();
      expect(flow?.contains(el as Node), sel).toBe(true);
    }
  });

  it('gives ensureRealmFactionFilter a home inside the region', () => {
    // main.ts inserts #offline-faction-filter with
    // `row.parentElement?.insertBefore(host, row)`, so the strip lands wherever
    // the class row lives. It must be the region, not the form, or the tabs
    // would pin above a scrolling roster they belong to.
    const row = doc.querySelector('#offline-select .mini-class-row');
    expect(row?.parentElement).toBe(flow);
  });
});

describe('offline creator: the region is only a box on the desktop card', () => {
  it('is display:contents by default, so the stacked layouts are unchanged', () => {
    // Phones, mobile-touch and the <900px card all order these rows as direct
    // flex children of .char-create; the wrapper must contribute no box there.
    expect(shellCss).toContain('.cs-offline-flow {\n    display: contents;\n  }');
  });

  it('becomes the scroller, and the footer becomes rigid, on the >=900px card', () => {
    expect(shellCss).toContain(
      'body:not(.mobile-touch) #offline-select .cs-offline-flow {\n      display: flex;',
    );
    expect(shellCss).toMatch(
      /body:not\(\.mobile-touch\) #offline-select \.cs-offline-flow \{[^}]*overflow-y: auto;/,
    );
    expect(shellCss).toMatch(
      /body:not\(\.mobile-touch\) #offline-select \.auth-actions \{[^}]*flex: 0 0 auto;/,
    );
  });

  it('caps the roster so it cannot eat the region', () => {
    expect(shellCss).toMatch(
      /body:not\(\.mobile-touch\) #offline-select \.mini-class-row\.infernal-hero-roster \{[^}]*max-height:/,
    );
  });

  it('rows the right column so the class sheet cannot be laid against the turntable', () => {
    // Two explicit rows - turntable, then the sheet in the remainder - rather
    // than two flex items each sized from their own content.
    expect(shellCss).toMatch(
      /body:not\(\.mobile-touch\) #offline-select \.charselect-col-right \{[^}]*display: grid;[^}]*grid-template-rows: [^;]*minmax\(150px, 1fr\);/,
    );
    expect(shellCss).toMatch(
      /body:not\(\.mobile-touch\) #offline-select #offline-class-details \{[^}]*overflow-y: auto;/,
    );
  });

  it('docks the appearance customizer only on a cs-wow takeover', () => {
    // The dock is a full-viewport-stage rule: 318px wide, capped at
    // `calc(100% - 322px)` of the STAGE. Ungated it also landed on this card,
    // where 100% is the 640px panel, which is how the editor ended up sized
    // against the wrong box. #offline-select only ever carries cs-wow on the
    // takeover, and index.html - the only page with this panel - never adds it.
    expect(shellCss).toContain('#offline-select.cs-wow .appearance-customizer,');
    expect(shellCss).not.toContain('\n  #offline-select .appearance-customizer,');
  });
});

describe('offline creator: the online creator is untouched', () => {
  it('leaves #charcreate-panel without the offline wrapper', () => {
    const online = doc.querySelector('#charcreate-panel');
    expect(online).not.toBeNull();
    expect(online?.querySelector('.cs-offline-flow')).toBeNull();
  });

  it('keeps the online Create / Back row where it was, in .char-create', () => {
    const create = doc.querySelector('#btn-create-char');
    const back = doc.querySelector('#btn-charcreate-back');
    expect(create?.closest('.auth-actions')?.parentElement?.className).toContain('char-create');
    expect(back?.closest('.cs-form-actions')).not.toBeNull();
  });
});
