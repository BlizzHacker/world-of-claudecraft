// The rig reference must carry NO animation scale channels.
//
// manualRigOntoReference() copies this file's clip library verbatim onto every
// body it rigs, so whatever the reference carries, the whole library inherits.
// It carried 444 scale channels — one per bone per clip, every one constant
// (1,1,1) — and an estate-wide repair had to remove 716,000 of them from
// /opt/cr-realms-store because bodies were SNAPPING SIZE between animations.
// That sweep did not cover the reference, so every newly rigged body was born
// with the defect again.
//
// A constant track is the dangerous kind and the reason nothing numeric caught
// this: on the reference, whose bind scale is 1, it is inert. Copied onto a body
// bound at any other scale it FORCES scale to 1 for the length of its clip and
// lets go the instant a clip without the track takes over.
//
// This reads the shipped bytes rather than mocking, because the thing being
// guarded IS the shipped bytes. The GLB JSON chunk is parsed directly so the
// test costs a single file read and no glTF toolchain.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REFERENCE = resolve(__dirname, '../public/models/chars/players/knight.glb');

/** Parse the JSON chunk out of a binary glTF container. */
function glbJson(path: string): {
  animations?: { name?: string; channels: { target: { path: string } }[] }[];
} {
  const buf = readFileSync(path);
  expect(buf.readUInt32LE(0), `${path} is not a GLB (magic)`).toBe(0x46546c67);
  const jsonLength = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16), 'first chunk must be JSON').toBe(0x4e4f534a);
  return JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8'));
}

describe('rig reference animation channels', () => {
  const gltf = glbJson(REFERENCE);
  const animations = gltf.animations ?? [];

  it('still carries its full clip library', () => {
    // Guards the other direction: a "fix" that deleted clips instead of
    // channels would otherwise pass the check below.
    expect(animations.length).toBe(25);
  });

  it('has no scale channel in any clip', () => {
    const offenders = animations
      .map((a, i) => ({
        name: a.name ?? `#${i}`,
        scale: a.channels.filter((c) => c.target.path === 'scale').length,
      }))
      .filter((a) => a.scale > 0);
    expect(
      offenders,
      'the rig reference is copied verbatim onto every rigged body; a scale channel here reseeds the size-snap defect across the whole library. Run: node scripts/realm_assets/strip_scale.mjs public/models/chars/players/knight.glb',
    ).toEqual([]);
  });

  it('still animates rotation and translation', () => {
    // Proves the strip removed only scale: every clip must still drive bones.
    for (const anim of animations) {
      const paths = new Set(anim.channels.map((c) => c.target.path));
      expect(paths.has('rotation') || paths.has('translation'), anim.name).toBe(true);
    }
  });
});
