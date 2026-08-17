import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { realmBodyKeyForEntity } from '../src/render/characters';
import { setBodyOverrides, VISUALS } from '../src/render/characters/manifest';
import { setActiveRealmForOffline } from '../src/sim/realms/registry';
import type { Entity } from '../src/sim/types';

// Two faults met on the character sheet and both are pinned here.
//
// 1. THE BODY. The paperdoll composed the modular body unconditionally, so a
//    character whose world body is a published realm GLB saw the stock KayKit
//    mini on their own sheet while their portrait chip - which already ran the
//    shared chain - showed the real one. The world's rule is now a named
//    function and the sheet calls THAT, so the two cannot drift again.
// 2. THE PANEL. Every fill, border and type size on the sheet was written
//    against a token vocabulary this branch never declared, so the whole
//    surface painted nothing and the 3D world showed through it.

const REALM = 'infernal';
const HERO_URL = '/cr-realms/infernal/test_paperdoll_hero_druid.glb';
const CLASS_URL = '/cr-realms/infernal/test_paperdoll_class_druid.glb';
const FEMALE_URL = '/cr-realms/infernal/test_paperdoll_class_druid_female.glb';

const hud = readFileSync(join(__dirname, '../src/ui/hud.ts'), 'utf8');
const visualIndex = readFileSync(join(__dirname, '../src/render/characters/index.ts'), 'utf8');
const painter = readFileSync(join(__dirname, '../src/ui/char_window.ts'), 'utf8');
const tokens = readFileSync(join(__dirname, '../src/styles/tokens.css'), 'utf8');
const components = readFileSync(join(__dirname, '../src/styles/components.css'), 'utf8');

function player(over: Record<string, unknown> = {}): Entity {
  return {
    id: 1,
    kind: 'player',
    templateId: 'druid',
    ...over,
  } as unknown as Entity;
}

afterEach(() => {
  setActiveRealmForOffline(null);
  setBodyOverrides(REALM, {});
  setBodyOverrides('claudecraft', {});
});

describe('realmBodyKeyForEntity: the one rule both the world and the sheet read', () => {
  it('answers with the published realm body, and resolves it to a real visual', () => {
    setActiveRealmForOffline(REALM);
    setBodyOverrides(REALM, { 'class:druid': { assetUrl: CLASS_URL } });
    const key = realmBodyKeyForEntity(player());
    expect(key).not.toBeNull();
    expect(VISUALS[key as string]?.url).toBe(CLASS_URL);
  });

  it('keeps the hero body ahead of the class body, and an explicit Female ahead of both', () => {
    setActiveRealmForOffline(REALM);
    setBodyOverrides(REALM, {
      'class:druid': { assetUrl: CLASS_URL },
      'class:druid:f': { assetUrl: FEMALE_URL },
      'hero:infernal-hero-druid': { assetUrl: HERO_URL },
    });
    const female = realmBodyKeyForEntity(player({ modularAppearance: { gender: 'female' } }));
    expect(VISUALS[female as string]?.url).toBe(FEMALE_URL);
    const male = realmBodyKeyForEntity(player({ modularAppearance: { gender: 'male' } }));
    expect(VISUALS[male as string]?.url).toBe(CLASS_URL);
  });

  it('never claims a claudecraft character: that realm stays 100% stock/modular', () => {
    setActiveRealmForOffline('claudecraft');
    setBodyOverrides('claudecraft', { 'class:druid': { assetUrl: CLASS_URL } });
    expect(realmBodyKeyForEntity(player())).toBeNull();
  });

  it('answers null when the realm published no body for the character', () => {
    setActiveRealmForOffline(REALM);
    setBodyOverrides(REALM, { 'class:warrior': { assetUrl: CLASS_URL } });
    expect(realmBodyKeyForEntity(player())).toBeNull();
  });
});

describe('the paperdoll resolves through the same seam as the world', () => {
  it('leaves exactly one copy of the realm-body precedence', () => {
    // The world's factory must CALL the helper, not re-derive it, and nothing
    // else may inline the claudecraft carve-out.
    expect(visualIndex).toContain('const realmBodyKey = realmBodyKeyForEntity(e);');
    const inlined = [
      ...visualIndex.matchAll(/=== 'claudecraft' \? null : overrideVisualKeyForEntity/g),
    ];
    expect(inlined, 'the rule must live in realmBodyKeyForEntity only').toHaveLength(1);
    expect(hud).not.toMatch(/=== 'claudecraft'/);
  });

  it('mounts the realm body on the sheet and stops composing when one claims it', () => {
    expect(hud).toContain('realmBodyKeyForEntity');
    const mount = hud.slice(hud.indexOf('private mountCharPreview('));
    const body = mount.slice(0, mount.indexOf("framing: 'sheet'"));
    // The look is dropped whenever a realm body (or the mech) owns the geometry.
    expect(body).toMatch(
      /const look =\s*\n?\s*previewKey === 'player_mech' \|\| realmBodyKey \? null : modularLookFor\(this\.sim\.player\)/,
    );
    // ...and the realm body is what gets mounted, even for a caller that only
    // knows "class vs mech" (the cosmetic skin picker).
    expect(body).toContain('previewKey: realmBodyKey ?? previewKey');
  });

  it('does not add armour layering to the paperdoll: gear is told by the sockets', () => {
    // A realm override body is one mesh with one material, so per-slot layering
    // is impossible on it. The sockets flanking the turntable stay the whole
    // equipment story.
    expect(painter).toContain("row.className = 'equip-slot'");
    expect(painter).toContain('row.dataset.equipSlot = slot');
    expect(painter).not.toMatch(/setWorn|armorLayer|layerArmou?r/);
  });
});

describe('the character sheet keeps its panel', () => {
  const SHEET_START = components.indexOf('/* ---------- character window ---------- */');
  const SHEET_END = components.indexOf('.char-item-viewer {');
  const sheetCss = components.slice(SHEET_START, SHEET_END);

  it('has a start and an end to read', () => {
    expect(SHEET_START).toBeGreaterThan(-1);
    expect(SHEET_END).toBeGreaterThan(SHEET_START);
  });

  it('declares every custom property the sheet paints with', () => {
    // The fault this pins: --panel-l0/l1/l2-bg and eight more names were read
    // by these rules and declared nowhere, and an undefined custom property
    // takes its whole declaration down with it - which is why the sheet had no
    // background, no borders and no focus ring.
    const declared = new Set<string>();
    for (const m of tokens.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) declared.add(m[1]);
    const missing = new Set<string>();
    for (const m of sheetCss.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
      if (!declared.has(m[1])) missing.add(m[1]);
    }
    expect([...missing].sort(), 'undeclared token read by the character sheet').toEqual([]);
  });

  it('declares the panel layer ramp from the themed panel colours', () => {
    // l0 and l2 are COLOURS: both are used as gradient stops, where a gradient
    // would be invalid. Both derive from the two colours src/ui/theme.ts
    // rewrites per preset, so the ramp follows the theme.
    expect(tokens).toMatch(/--panel-l0-bg:\s*color-mix\(in srgb, var\(--panel-edge\)/);
    expect(tokens).toMatch(/--panel-l2-bg:\s*color-mix\(in srgb, var\(--panel-base\)/);
    // l1 is the value a45d20eb32 deleted, restored verbatim. It must stay the
    // GRADIENT: three rules paint it through background-image, where a plain
    // colour is invalid and would leave them as blank as the sheet was.
    expect(tokens).toMatch(/--panel-l1-bg:\s*var\(--panel-bg\);/);
  });

  it('keeps the type scale at the values the same revert deleted', () => {
    expect(tokens).toMatch(/--text-xs:\s*12px;/);
    expect(tokens).toMatch(/--text-sm:\s*13px;/);
  });

  it('nests both socket columns inside the panel, flanking the model', () => {
    // Structural, not pixel: the columns are children of .paperdoll, which is a
    // child of the sheet grid inside .window-body. Nothing in the sheet is a
    // sibling of the panel.
    const paperdoll = painter.slice(painter.indexOf('const paperdoll = `<div class="paperdoll">'));
    const markup = paperdoll.slice(0, paperdoll.indexOf('</div>`'));
    expect(markup).toContain('<div class="equip-col" id="equip-col-left">');
    expect(markup).toContain('<div class="equip-col equip-col-right" id="equip-col-right">');
    expect(markup.indexOf('equip-col-left')).toBeLessThan(markup.indexOf('char-model-panel'));
    expect(markup.indexOf('char-model-panel')).toBeLessThan(markup.indexOf('equip-col-right'));
    expect(painter).toContain('<section class="char-sheet-paperdoll">${paperdoll}');
  });

  it('scrolls the sheet COLUMNS inside the frame instead of overflowing the body', () => {
    // The frame is a fixed-height box; without this the body was one ~1300px
    // scroll inside ~860px of frame, so at 1366x768 the sockets, the bag tray
    // and the tail of the stat column all sat below the fold.
    expect(sheetCss).toContain('@media (min-width: 921px)');
    const desktop = sheetCss.slice(sheetCss.indexOf('@media (min-width: 921px)'));
    expect(desktop).toMatch(
      /#char-window > \.window-frame > \.window-body \{[^}]*overflow: hidden/s,
    );
    expect(desktop).toMatch(/#char-window \.char-sheet > \* \{[^}]*overflow-y: auto/s);
    expect(desktop).toMatch(/#char-window \.char-sheet > \* \{[^}]*min-height: 0/s);
    // Keyboard and gamepad: a focused socket must land clear of the column edge.
    expect(desktop).toMatch(/scroll-margin:/);
  });
});
