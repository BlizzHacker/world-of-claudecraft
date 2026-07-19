import { describe, expect, it } from 'vitest';
import { resolveClipMap } from '../src/render/characters/clip_resolution';

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
