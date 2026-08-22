import { describe, expect, it } from 'vitest';
import {
  nextResolvableClip,
  resolveClipMap,
  resolveClipMapScoped,
} from '../src/render/characters/clip_resolution';
import type { ClipMap } from '../src/render/characters/manifest';

describe('authored character clip resolution', () => {
  it('fills missing Meshy action slots from the available animated takes', () => {
    const clips = resolveClipMap(
      {
        idle: 'Idle',
        walk: 'Walking',
        run: 'Running',
        attack: [],
        hit: ['Hit'],
        cast: 'Cast',
        death: 'Death',
      },
      ['Walking', 'Running', 'Attack', 'Axe_Spin_Attack'],
    );
    expect(clips.idle).toBe('Walking');
    expect(clips.walk).toBe('Walking');
    expect(clips.run).toBe('Running');
    expect(clips.attack).toContain('Attack');
    expect(clips.hit).toContain('Attack');
    expect(clips.cast).toBe('Axe_Spin_Attack');
    expect(clips.death).toBe('Attack');
  });
});

describe('attack rotation resolvability (nextResolvableClip)', () => {
  const clips = ['Attack_A', 'Attack_Missing', 'Attack_C'];
  const resolvable = (name: string) => name !== 'Attack_Missing';

  it('skips the dead slot the raw modulo rotation used to consume', () => {
    // Pre-fix behavior: playAttack picked clips[attackIdx % clips.length] and
    // playOneShot silently no-opped on an unresolvable name, so every third
    // swing showed no animation at all. Slot 1 is that dead slot:
    expect(clips[1 % clips.length]).toBe('Attack_Missing');
    // The helper hands the swing the next RESOLVABLE clip instead.
    expect(nextResolvableClip(clips, 1, resolvable)).toEqual({
      name: 'Attack_C',
      nextIdx: 3,
    });
  });

  it('cycles only through resolvable clips across successive swings', () => {
    const seen: string[] = [];
    let idx = 0;
    for (let swing = 0; swing < 6; swing++) {
      const pick = nextResolvableClip(clips, idx, resolvable);
      expect(pick).not.toBeNull();
      seen.push(pick!.name);
      idx = pick!.nextIdx;
    }
    expect(seen).toEqual(['Attack_A', 'Attack_C', 'Attack_A', 'Attack_C', 'Attack_A', 'Attack_C']);
  });

  it('returns null when no clip in the rotation resolves', () => {
    expect(nextResolvableClip(clips, 0, () => false)).toBeNull();
  });

  it('returns null for an empty rotation', () => {
    expect(nextResolvableClip([], 0, () => true)).toBeNull();
  });

  it('normalizes a rotation index that ran past the length', () => {
    // 7 mod 3 lands on the dead slot; the pick skips it and advances past it.
    expect(nextResolvableClip(clips, 7, resolvable)).toEqual({
      name: 'Attack_C',
      nextIdx: 9,
    });
  });
});

describe('scoped death/sit resolution (resolveClipMapScoped)', () => {
  const authored: ClipMap = {
    idle: 'Idle',
    walk: 'Walking_A',
    run: 'Running_A',
    attack: ['Attack_Chop'],
    death: 'Death_A',
    sitDown: 'Sit_Floor_Down',
    sitIdle: 'Sit_Floor_Idle',
  };

  it("remaps an unresolvable death name to the body's own death-like take", () => {
    const scoped = resolveClipMapScoped(
      authored,
      ['Idle', 'Walking_A', 'Running_A', 'Attack_Chop', 'Die'],
      ['death', 'sitDown'],
    );
    expect(scoped).not.toBeNull();
    expect(scoped!.death).toBe('Die');
    // sitDown had no sit-like take in the inventory: it stays authored (the
    // action simply never resolves), never grabs an arbitrary first clip.
    expect(scoped!.sitDown).toBe('Sit_Floor_Down');
  });

  it("remaps an unresolvable sitDown name to the body's own sit take", () => {
    const scoped = resolveClipMapScoped(
      authored,
      ['Idle', 'Walking_A', 'Running_A', 'Attack_Chop', 'Death_A', 'Sit_Ground_Down'],
      ['death', 'sitDown'],
    );
    expect(scoped).not.toBeNull();
    expect(scoped!.death).toBe('Death_A');
    expect(scoped!.sitDown).toBe('Sit_Ground_Down');
  });

  it('never touches fields outside the scope (the Jump_Idle-as-idle guard)', () => {
    // idle is ALSO unresolvable here and Jump_Idle would loose-match it; the
    // scoped resolver must leave every out-of-scope field byte-identical.
    const broken: ClipMap = { ...authored, idle: 'Idle_X' };
    const scoped = resolveClipMapScoped(
      broken,
      ['Jump_Idle', 'Die', 'Walking_A'],
      ['death', 'sitDown'],
    );
    expect(scoped).not.toBeNull();
    expect(scoped!.idle).toBe('Idle_X');
    expect(scoped!.walk).toBe('Walking_A');
    expect(scoped!.death).toBe('Die');
  });

  it('returns null when every scoped field already resolves', () => {
    const scoped = resolveClipMapScoped(
      authored,
      ['Idle', 'Walking_A', 'Running_A', 'Attack_Chop', 'Death_A', 'Sit_Floor_Down'],
      ['death', 'sitDown'],
    );
    expect(scoped).toBeNull();
  });

  it('returns null when nothing in the inventory matches a scoped role', () => {
    const scoped = resolveClipMapScoped(authored, ['Walking_A', 'Running_A'], ['death', 'sitDown']);
    expect(scoped).toBeNull();
  });

  it('leaves the None sentinel of single-clip objective props alone', () => {
    // mob_yumi_cat parks every required field on the 'None' sentinel and names
    // its one real clip only for `hit`; degrading death onto that clip would
    // change the prop's deliberate freeze-in-place death.
    const sentinel: ClipMap = { ...authored, death: 'None', sitDown: undefined };
    const scoped = resolveClipMapScoped(sentinel, ['Hit_A'], ['death', 'sitDown']);
    expect(scoped).toBeNull();
  });

  it('skips absent optional fields instead of inventing them', () => {
    const noSit: ClipMap = { ...authored, sitDown: undefined, death: 'Death_A' };
    const scoped = resolveClipMapScoped(noSit, ['Sit_Floor_Down', 'Death_A'], ['death', 'sitDown']);
    expect(scoped).toBeNull();
  });
});
