import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUALITY_COLOR } from '../src/ui/icons';

// An undefined CSS custom property is INVALID AT COMPUTED-VALUE TIME: it does
// not fall back to an initial value, it takes the whole declaration that reads
// it down with it. So one deleted token silently deletes every rule that paints
// with it, and nothing anywhere reports it - not the build, not tsc, not biome.
//
// That is exactly how a45d20eb32 ("revert PR #1736 interface overhaul",
// 2026-07-12) shipped: it deleted a 109-line token block from tokens.css and
// left every consuming rule in components.css / hud.css / hud.mobile.css
// standing. The windows that read those names painted no background (the 3D
// world showed straight through them), no borders, no focus rings, and fell
// back to the inherited body font size. b3f3cbfc42 restored the twelve names
// the character sheet needed; 39 more were still orphaned across the options
// menu, the talent tree, the delve and vendor windows, the notification badges,
// the mobile shell and the nameplates.
//
// This suite is the guard that makes that class of fault loud. It is deliberately
// whole-directory: the fault was never in one window, it was in the vocabulary.

const STYLES = join(__dirname, '../src/styles');
const SRC = join(__dirname, '../src');

const cssFiles = readdirSync(STYLES).filter((f) => f.endsWith('.css'));
const css = new Map(cssFiles.map((f) => [f, readFileSync(join(STYLES, f), 'utf8')]));

/** Comments hold prose like "--foo: bar", which is not a declaration. */
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every custom property DECLARED anywhere in src/styles. */
const declaredInCss = new Set<string>();
for (const text of css.values()) {
  for (const m of stripComments(text).matchAll(/(?:^|[;{}\s])(--[A-Za-z0-9_-]+)\s*:/g)) {
    declaredInCss.add(m[1]);
  }
}

/**
 * Custom properties written at RUNTIME onto an element, which are declared as
 * far as the cascade is concerned even though no stylesheet holds them: the
 * aura overlay's placement vars, the Discord tier ring, the Vale Cup flag
 * colours. Scanned rather than allowlisted so a new painter-written token does
 * not fail this suite the day it lands.
 */
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    if (name === 'styles' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|html)$/.test(name)) out.push(p);
  }
  return out;
};
const declaredAtRuntime = new Set<string>();
for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes('--')) continue;
  // el.style.setProperty('--x', ...)
  for (const m of text.matchAll(/setProperty\(\s*['"`](--[A-Za-z0-9_-]+)/g)) {
    declaredAtRuntime.add(m[1]);
  }
  // style="--x:${...}" in a painted template
  for (const m of text.matchAll(/style\s*=\s*["'`][^"'`]*?(--[A-Za-z0-9_-]+)\s*:/g)) {
    declaredAtRuntime.add(m[1]);
  }
  for (const m of text.matchAll(/;\s*(--[A-Za-z0-9_-]+)\s*:\s*\$\{/g)) {
    declaredAtRuntime.add(m[1]);
  }
}

/**
 * References that MATTER: var(--x) with no fallback. var(--x, 1px) is safe by
 * construction - the fallback is what makes an undeclared name legal - so a
 * painter-supplied value read defensively is not a fault and is not counted.
 */
const hardRefs = new Map<string, Set<string>>();
for (const [file, text] of css) {
  for (const m of stripComments(text).matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
    if (!hardRefs.has(m[1])) hardRefs.set(m[1], new Set());
    hardRefs.get(m[1])?.add(file);
  }
}

describe('src/styles declares every custom property it paints with', () => {
  it('has actually read the stylesheets', () => {
    // A silent glob miss would make every assertion below vacuously pass.
    expect(cssFiles).toContain('tokens.css');
    expect(cssFiles).toContain('components.css');
    expect(cssFiles.length).toBeGreaterThanOrEqual(10);
    expect(declaredInCss.size).toBeGreaterThan(200);
    expect(hardRefs.size).toBeGreaterThan(200);
  });

  it('reads no custom property that nothing declares', () => {
    const missing: string[] = [];
    for (const [name, files] of hardRefs) {
      if (declaredInCss.has(name) || declaredAtRuntime.has(name)) continue;
      missing.push(`${name}  (read by ${[...files].sort().join(', ')})`);
    }
    // Every entry here is a rule that silently does not exist at runtime.
    expect(
      missing.sort(),
      'custom properties read by src/styles that no stylesheet declares and no painter writes',
    ).toEqual([]);
  });

  it('still counts the names the revert orphaned, so this guard cannot go vacuous', () => {
    // If a refactor ever stops these being read, the assertion above would pass
    // for the wrong reason. These are the highest-count casualties of
    // a45d20eb32; they must still be read, and therefore still be declared.
    for (const name of [
      '--color-panel-l2-base',
      '--panel-border',
      '--dur-fast',
      '--control-h',
      '--focus-ring-color',
      '--window-titlebar-h',
      '--text-md',
      '--text-lg',
      '--text-title',
    ]) {
      expect(hardRefs.has(name), `${name} is no longer read by any rule`).toBe(true);
      expect(declaredInCss.has(name), `${name} is read but not declared`).toBe(true);
    }
  });
});

describe('the restored tokens keep the values they were restored from', () => {
  // Parsed into name -> value so a failure reports the one declaration that
  // drifted, instead of diffing the whole 29KB file.
  const decl = new Map<string, string>();
  for (const m of stripComments(css.get('tokens.css') ?? '').matchAll(
    /(?:^|[;{}\s])(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g,
  )) {
    decl.set(m[1], m[2].trim());
  }

  it('parsed tokens.css into declarations', () => {
    expect(decl.size).toBeGreaterThan(150);
    expect(decl.get('--panel-base')).toBe('#15151f');
  });

  it('mirrors QUALITY_COLOR in src/ui/icons.ts exactly', () => {
    // These six are restored VERBATIM rather than derived precisely so a CSS
    // border and the canvas icon frame beside it cannot drift apart. Reading
    // the real table keeps that promise checkable instead of commented.
    const fromCss = Object.fromEntries(
      Object.keys(QUALITY_COLOR).map((q) => [q, decl.get(`--color-quality-${q}`)]),
    );
    expect(fromCss).toEqual(QUALITY_COLOR);
  });

  it('keeps the authored density, type and motion steps', () => {
    // Recovered verbatim from a45d20eb32^:src/styles/tokens.css.
    const authored: Record<string, string> = {
      '--control-h-compact': '28px',
      '--control-h': '36px',
      '--control-h-touch': '44px',
      '--touch-min': '40px',
      '--touch-cell': '56px',
      '--text-md': '15px',
      '--text-lg': '18px',
      '--text-title': '22px',
      '--dur-fast': '120ms',
      '--window-titlebar-h': '40px',
      '--window-titlebar-h-touch': '48px',
      '--window-ornament-size': '12px',
      '--focus-ring-width': '2px',
      '--focus-ring-offset': '2px',
      '--color-urgency-warn': '#ff8800',
    };
    const actual = Object.fromEntries(Object.keys(authored).map((n) => [n, decl.get(n)]));
    expect(actual).toEqual(authored);
  });

  it('anchors every re-derived token on a themeable one, never on a new literal', () => {
    // The reason b3f3cbfc42 derived rather than hardcoded: src/ui/theme.ts
    // rewrites --panel-base / --panel-edge and the --color-* accents per preset.
    // A literal here would freeze these surfaces at the dark preset's values and
    // strand the light Parchment panel.
    const aliases: Record<string, string> = {
      '--panel-border': 'var(--color-border-default)',
      '--color-text': 'var(--color-text-light)',
      '--text-muted': 'var(--color-text-muted)',
      '--cursor-pointer': 'var(--cursor-point)',
      '--focus-ring': 'var(--color-border-focus)',
      '--focus-ring-color': 'var(--color-border-focus)',
      '--color-bg-deep': 'var(--panel-edge)',
      '--window-border': 'var(--color-border-default)',
      '--window-title-color': 'var(--color-gold)',
      '--color-panel-l2-base': 'var(--color-bg-dark)',
      '--color-panel-l0-border': 'var(--color-border-default)',
      '--color-notify-info': 'var(--color-border-default)',
      '--color-notify-success': 'var(--color-text-success)',
      '--color-notify-warning': 'var(--color-urgency-warn)',
      '--color-notify-critical': 'var(--color-text-error)',
    };
    const actual = Object.fromEntries(Object.keys(aliases).map((n) => [n, decl.get(n)]));
    expect(actual).toEqual(aliases);
    // The two that are mixes rather than plain aliases still read a themed base.
    expect(decl.get('--color-panel-l0-bg')).toContain('var(--panel-base)');
    expect(decl.get('--shadow-panel')).toContain('var(--panel-edge)');
  });

  it('points every alias at a token that is itself declared', () => {
    // An alias onto a name that does not exist is the SAME fault one level down:
    // it computes to invalid and takes its consumer's declaration with it.
    const dangling: string[] = [];
    for (const [name, value] of decl) {
      for (const m of value.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
        if (!declaredInCss.has(m[1])) dangling.push(`${name} -> ${m[1]}`);
      }
    }
    expect(dangling.sort(), 'tokens.css declarations aliasing an undeclared name').toEqual([]);
  });

  it('gives --dev-outline the same defensive contract its sibling --dev-glow has', () => {
    // hud.css documents --dev-outline as painter-supplied per tier, but no
    // painter sets it - so --dev-ring was invalid and took the whole ten-layer
    // text-shadow with it, including the plain black drop every other nameplate
    // gets. transparent keeps the ring invisible (no hue is invented) while
    // letting the rest of the declaration paint.
    expect(decl.get('--dev-outline')).toBe('transparent');
    expect(declaredAtRuntime.has('--dev-outline'), 'a painter now sets it').toBe(false);
  });
});
