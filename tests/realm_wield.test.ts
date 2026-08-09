// The wield term: a weapon's size is a function of WHO IS HOLDING IT.
//
// prepareVisual() normalises every body to VisualDef.height by dividing by the
// body's own measured raw height, and a weapon attached to a hand bone rides
// through the same divisor. The generated realm bank was rigged from source
// meshes authored at wildly different scales, so those raw heights span ~3x --
// which meant one fixed-length sword read as a dagger on a giant and a
// greatsword on a gnome. REALM_WIELD_SCALE cancels the normalisation.
//
// These tests pin the three things that can silently break it: the multiplier
// reaching the compose math, the generated table actually covering the bodies
// that need it, and the attach path passing it in.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  REALM_WIELD_REF_HEIGHT,
  REALM_WIELD_SCALE,
} from '../src/render/characters/realm_wield.generated';
import { variantGripTransform } from '../src/render/characters/weapon_grip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('wield scale composes into the grip', () => {
  it('defaults to identity, so every un-listed body is byte-identical to before', () => {
    const bare = variantGripTransform(1.2, false, 0.05, 1.6, undefined);
    const explicit = variantGripTransform(1.2, false, 0.05, 1.6, undefined, 1);
    expect(explicit).toEqual(bare);
  });

  it('scales the model AND the hand-local slide, so the fist stays on the grip', () => {
    const override = { scale: 1.3, pos: [0.1, 0.2, -0.05] as [number, number, number] };
    const ref = variantGripTransform(1.2, false, 0.05, 8, override);
    const big = variantGripTransform(1.2, false, 0.05, 8, override, 1.5);
    expect(big.scale).toBeCloseTo(ref.scale * 1.5, 6);
    for (let i = 0; i < 3; i++) expect(big.position[i]).toBeCloseTo(ref.position[i] * 1.5, 6);
    // Orientation is a property of the weapon, never of the wielder.
    expect(big.quaternion).toEqual(ref.quaternion);
  });

  it('rejects a nonsense multiplier rather than shipping a zero-size weapon', () => {
    const ref = variantGripTransform(1.2, false, 0.05, 8, { scale: 1.1 });
    for (const bad of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(variantGripTransform(1.2, false, 0.05, 8, { scale: 1.1 }, bad).scale).toBeCloseTo(
        ref.scale,
        6,
      );
    }
  });
});

describe('the generated wield table', () => {
  it('covers the armed generated bodies, which are the ones that need it', () => {
    const manifest = readFileSync(
      join(ROOT, 'src/render/characters/manifest.generated.ts'),
      'utf8',
    );
    const keys = [...manifest.matchAll(/^ {2}(realm_[a-z0-9_]+): \{$/gm)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(100);
    const covered = keys.filter((k) => REALM_WIELD_SCALE[k] !== undefined);
    // A body may legitimately be missing (its GLB left the store), but the table
    // going stale wholesale is the failure this guards.
    expect(covered.length / keys.length).toBeGreaterThan(0.9);
  });

  it('spans a real range and stays inside its fuse', () => {
    const v = Object.values(REALM_WIELD_SCALE);
    expect(v.length).toBeGreaterThan(100);
    expect(Math.min(...v)).toBeGreaterThanOrEqual(0.4);
    expect(Math.max(...v)).toBeLessThanOrEqual(2.2);
    // If every body were reference-sized there would be no bug and no table.
    expect(Math.max(...v) / Math.min(...v)).toBeGreaterThan(1.5);
    expect(REALM_WIELD_REF_HEIGHT).toBeGreaterThan(1);
  });
});

describe('the attach path consumes it', () => {
  it('assets.ts looks the wielder up and passes it to both grip paths', () => {
    const src = readFileSync(join(ROOT, 'src/render/characters/assets.ts'), 'utf8');
    expect(src).toContain("from './realm_wield.generated'");
    expect(src).toContain('function wieldScaleFor(');
    // Both the variant-pack grip and the KayKit hand-grip fallback must take it,
    // or half the bank silently keeps the old fixed-length behaviour.
    expect(src).toMatch(/applyVariantGrip\(payload, att\.bone, variantGrip, att\.url, wield\)/);
    expect(src).toMatch(/applyHandGrip\(payload, root, att\.bone, att\.url, wield\)/);
  });
});
