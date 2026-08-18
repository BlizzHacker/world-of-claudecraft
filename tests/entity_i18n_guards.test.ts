// The entity-text stale-client guards (R34 family) in src/ui/entity_i18n.ts:
// knownLetterId's own-property membership, and tEntity's Record-indexed arms
// reading through ownEntry so a wire-supplied PROTOTYPE key ('constructor',
// '__proto__') falls back to the raw id like any other unknown id instead of
// rendering a Function's fields ("Object", undefined) or throwing
// (set.bonuses.find on a Function).
import { describe, expect, it } from 'vitest';
import { QUEST_LETTERS } from '../src/sim/content/letters';
import type { PlayerClass } from '../src/sim/types';
import { knownLetterId, tEntity } from '../src/ui/entity_i18n';

const SHIPPED_LETTER = Object.values(QUEST_LETTERS)[0]?.letterId ?? '';
if (!SHIPPED_LETTER) throw new Error('no shipped quest letter in content');

// The 'class' arm is the one kind whose id is a typed union, so the cast is what
// makes the wire's reality expressible: the id still arrives as a raw string on
// a snapshot or a chat link, and the type does not gate what the runtime sees.
const PROTOTYPE_ID: string = 'constructor';

describe('knownLetterId', () => {
  it('claims a shipped letter and refuses unknown and prototype ids', () => {
    expect(knownLetterId(SHIPPED_LETTER)).toBe(true);
    expect(knownLetterId('letter_from_a_future_expansion')).toBe(false);
    expect(knownLetterId('constructor')).toBe(false);
    expect(knownLetterId('__proto__')).toBe(false);
  });
});

describe('tEntity prototype-key fallback (the ownEntry arms)', () => {
  it('every Record-indexed kind renders a prototype key as the raw id', () => {
    expect(tEntity({ kind: 'quest', id: 'constructor', field: 'title' })).toBe('constructor');
    expect(tEntity({ kind: 'mob', id: 'constructor', field: 'name' })).toBe('constructor');
    expect(tEntity({ kind: 'npc', id: 'constructor', field: 'name' })).toBe('constructor');
    // The itemSet arm THREW before the guard (set.bonuses.find on a
    // Function); the raw-id return is also the never-throws pin.
    expect(tEntity({ kind: 'itemSet', id: 'constructor', field: 'bonus2' })).toBe('constructor');
  });

  it('the class, ability and item arms hold the same contract', () => {
    // These three indexed their Records directly while the arms beside them
    // read through ownEntry: 'constructor' reached Function.prototype.constructor,
    // whose .name is the string "Object" (so the name fields rendered a real
    // class/ability/item called Object) and whose .description does not exist
    // (so the description fields rendered undefined).
    expect(tEntity({ kind: 'class', id: PROTOTYPE_ID as PlayerClass, field: 'name' })).toBe(
      'constructor',
    );
    expect(tEntity({ kind: 'class', id: PROTOTYPE_ID as PlayerClass, field: 'description' })).toBe(
      'constructor',
    );
    expect(tEntity({ kind: 'ability', id: 'constructor', field: 'name' })).toBe('constructor');
    expect(tEntity({ kind: 'ability', id: 'constructor', field: 'description' })).toBe(
      'constructor',
    );
    expect(tEntity({ kind: 'item', id: 'constructor', field: 'name' })).toBe('constructor');
  });

  it('holds it for the object-shaped prototype key too', () => {
    // '__proto__' resolves to Object.prototype: truthy like the Function, but
    // with NO string fields at all, so the same arms returned undefined.
    expect(tEntity({ kind: 'ability', id: '__proto__', field: 'name' })).toBe('__proto__');
    expect(tEntity({ kind: 'item', id: '__proto__', field: 'name' })).toBe('__proto__');
  });

  it('a genuinely unknown id keeps the same raw-id contract', () => {
    expect(tEntity({ kind: 'quest', id: 'q_future_expansion', field: 'title' })).toBe(
      'q_future_expansion',
    );
    expect(tEntity({ kind: 'mob', id: 'future_mob', field: 'name' })).toBe('future_mob');
    expect(tEntity({ kind: 'class', id: 'necromancer' as PlayerClass, field: 'name' })).toBe(
      'necromancer',
    );
    expect(tEntity({ kind: 'ability', id: 'future_ability', field: 'name' })).toBe(
      'future_ability',
    );
    expect(tEntity({ kind: 'item', id: 'future_item', field: 'name' })).toBe('future_item');
  });
});
