import { describe, expect, it } from 'vitest';
import { isValidBuilderPropKey } from '../server/builder_props';
import { placeablePropKeys } from '../src/render/props';

describe('builder prop key validation', () => {
  it.each(placeablePropKeys())('accepts the native prop ID %s', (key) => {
    expect(isValidBuilderPropKey(key)).toBe(true);
  });

  it.each([
    'forged:iron_gate',
    'forged:Oak-Tree.v2',
    'forged:infernal/dark_paladin',
    `forged:${'a'.repeat(64)}`,
  ])('accepts the forged prop ID %s', (key) => {
    expect(isValidBuilderPropKey(key)).toBe(true);
  });

  it.each([
    'library:piktura/0123456789abcdef01234567',
    `library:${'a'.repeat(32)}/abcdef0123456789abcdef01`,
  ])('accepts the library prop ID %s', (key) => {
    expect(isValidBuilderPropKey(key)).toBe(true);
  });

  it.each([
    undefined,
    null,
    0,
    true,
    {},
    [],
    ['well'],
  ])('rejects a non-string client value', (value) => {
    expect(isValidBuilderPropKey(value)).toBe(false);
  });

  it.each([
    '',
    'not-a-native-prop',
    'well\u0000ignored',
    'well\nignored',
    'https://example.com/prop.glb',
    `forged:${'a'.repeat(65)}`,
    `forged:${'a'.repeat(121)}`,
    'forged:',
    'forged:.',
    'forged:..',
    'forged:../escape',
    'forged:realm/../escape',
    'forged:realm/name/extra',
    'forged:realm\\name',
    'forged:https://example.com/prop',
    'forged:name?download=1',
    'forged:name#fragment',
    'library:../0123456789abcdef01234567',
    'library:https://example.com/0123456789abcdef01234567',
    'library:PIKTURA/0123456789abcdef01234567',
    'library:piktura/0123456789ABCDEF01234567',
    'library:piktura/0123456789abcdef0123456',
    'library:piktura/0123456789abcdef012345678',
    'library:piktura/0123456789abcdef01234567/extra',
  ])('rejects the unsafe or unknown prop ID %s', (key) => {
    expect(isValidBuilderPropKey(key)).toBe(false);
  });
});
