// The dungeon door / exit-portal visual system extracted from renderer.ts.
// Geometry/material shape, shared-resource tagging, and the Nythraxis click-box
// special case. Three.js runs headless in Node (no WebGL needed for geometry).
import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { buildDoorBody, resetDoorPortalProfileCaches } from '../src/render/door_portal';
import { isSharedGeometry, isSharedMaterial } from '../src/render/shared_resource';

const meshes = (body: THREE.Group): THREE.Mesh[] =>
  body.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh);

describe('buildDoorBody: standard arch door', () => {
  it('builds arch + keystone + two plinths + portal, and returns the portal mesh', () => {
    const { body, portal } = buildDoorBody(true, null, false);
    const ms = meshes(body);
    // arch, keystone, plinth x2, portal
    expect(ms.length).toBe(5);
    expect(portal).toBeDefined();
    expect(body.children).toContain(portal);
  });

  it('positions the portal at y=2.15 with the classic 1x1.35x1 oval scale', () => {
    const { portal } = buildDoorBody(false, null, false);
    expect(portal?.position.y).toBeCloseTo(2.15);
    expect(portal?.scale.x).toBeCloseTo(1);
    expect(portal?.scale.y).toBeCloseTo(1.35);
    expect(portal?.scale.z).toBeCloseTo(1);
  });

  it('the stone frame meshes cast shadows', () => {
    const { body } = buildDoorBody(true, null, false);
    // every non-portal mesh (arch/keystone/plinths) casts a shadow
    const frame = meshes(body).filter((m) => m.geometry.type !== 'CircleGeometry');
    expect(frame.length).toBe(4);
    expect(frame.every((m) => m.castShadow)).toBe(true);
  });
});

describe('buildDoorBody: Nythraxis crypt click-box', () => {
  it('an entering nythraxis_crypt door is a single invisible click-box with no portal', () => {
    const { body, portal } = buildDoorBody(true, 'nythraxis_crypt', false);
    const ms = meshes(body);
    expect(ms.length).toBe(1);
    expect(portal).toBeUndefined();
    expect(ms[0].position.y).toBeCloseTo(2.1);
  });

  it('the special-case only applies when entering (an exit uses the normal arch)', () => {
    const { body, portal } = buildDoorBody(false, 'nythraxis_crypt', false);
    expect(meshes(body).length).toBe(5);
    expect(portal).toBeDefined();
  });
});

describe('shared-resource tagging (disposal guard contract)', () => {
  it('door geometries and materials are marked shared so per-view disposal skips them', () => {
    const { body, portal } = buildDoorBody(true, null, false);
    for (const m of meshes(body)) {
      expect(isSharedGeometry(m.geometry)).toBe(true);
      expect(isSharedMaterial(m.material as THREE.Material)).toBe(true);
    }
    if (!portal) throw new Error('expected a portal mesh');
    expect(isSharedMaterial(portal.material as THREE.Material)).toBe(true);
  });

  it('reuses the same cached geometry instances across builds', () => {
    const a = buildDoorBody(true, null, false);
    const b = buildDoorBody(true, null, false);
    const archA = meshes(a.body)[0];
    const archB = meshes(b.body)[0];
    // same shared geometry object, not a fresh allocation per door
    expect(archA.geometry).toBe(archB.geometry);
  });
});

describe('portal material: tint per direction and HDR boost per tier', () => {
  const portalMat = (entering: boolean, lowGfx: boolean): THREE.MeshBasicMaterial => {
    const { portal } = buildDoorBody(entering, null, lowGfx);
    if (!portal) throw new Error('expected a portal mesh');
    return portal.material as THREE.MeshBasicMaterial;
  };

  it('entering vs exit use distinct base tints', () => {
    // low tier: no boost, so the color is the raw tint
    const enter = portalMat(true, true);
    const exit = portalMat(false, true);
    expect(enter.color.getHex()).toBe(0x9a5df0);
    expect(exit.color.getHex()).toBe(0x6ab8ff);
    expect(enter.transparent).toBe(true);
    expect(enter.blending).toBe(THREE.AdditiveBlending);
    expect(enter.depthWrite).toBe(false);
  });

  it('non-low tier multiplies the tint by the bloom boost (2x), low tier does not', () => {
    const enterHigh = portalMat(true, false);
    const enterLow = portalMat(true, true);
    // The boost multiplies the working color channels by 2 (no clamp at this tint).
    expect(enterHigh.color.r).toBeCloseTo(enterLow.color.r * 2);
    expect(enterHigh.color.r).toBeGreaterThan(enterLow.color.r);
  });
});

// The swirl membrane. riftPortalTexture() is built from a 2D canvas, so it only
// exists where a document does; these cases install a minimal fake one (the sim
// suite runs in plain Node) and assert the shared door/waypoint/town-portal
// material takes it. Without a map the CircleGeometry fills edge to edge with one
// additively boosted colour: the flat violet slab that stood inside every D2
// waypoint pylon in every town square.
describe('portal material: the swirl membrane (flat-violet-slab regression)', () => {
  const hadDocument = 'document' in globalThis;
  const fakeCtx = () => ({
    fillStyle: '',
    strokeStyle: '',
    lineCap: '',
    lineWidth: 0,
    globalCompositeOperation: '',
    createRadialGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
  });
  const withFakeDocument = <T>(fn: () => T): T => {
    (globalThis as { document?: unknown }).document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }),
    };
    try {
      return fn();
    } finally {
      if (!hadDocument) delete (globalThis as { document?: unknown }).document;
    }
  };
  afterAll(() => resetDoorPortalProfileCaches());

  it('the door/waypoint portal carries a texture, not one flat colour', () => {
    resetDoorPortalProfileCaches();
    const mat = withFakeDocument(() => {
      const { portal } = buildDoorBody(true, null, false);
      if (!portal) throw new Error('expected a portal mesh');
      return portal.material as THREE.MeshBasicMaterial;
    });
    expect(mat.map, 'the shared portal swirl lost its membrane texture').toBeTruthy();
    // Still additive + double-sided + tinted per direction: the map is white and
    // carries only the soft radial falloff and the spiral arms the spin rides on.
    expect(mat.blending).toBe(THREE.AdditiveBlending);
    expect(mat.side).toBe(THREE.DoubleSide);
    expect(mat.transparent).toBe(true);
  });

  it('entering and leaving markers share the one cached texture', () => {
    resetDoorPortalProfileCaches();
    const [enter, exit] = withFakeDocument(() => {
      const a = buildDoorBody(true, null, false).portal?.material as THREE.MeshBasicMaterial;
      const b = buildDoorBody(false, null, false).portal?.material as THREE.MeshBasicMaterial;
      return [a, b];
    });
    expect(enter.map).toBe(exit.map);
    expect(enter.color.getHex()).not.toBe(exit.color.getHex());
  });
});
