import { describe, expect, it } from 'vitest';
import { chooseExternalPreviewClipName } from '../src/render/characters/preview_clip';

describe('external character preview clip selection', () => {
  it('prefers idle when the asset provides one', () => {
    expect(chooseExternalPreviewClipName(['Walking', 'Idle', 'Attack'])).toBe('Idle');
  });

  it('uses clean locomotion before arbitrary imported clips', () => {
    expect(chooseExternalPreviewClipName(['Boom_Dance', 'Running', 'Dead'])).toBe('Running');
    expect(chooseExternalPreviewClipName(['Cherish_Pop_Dance', 'Monster_Walk', 'Left_Slash'])).toBe(
      'Monster_Walk',
    );
  });

  it('falls back deterministically when every clip is a bad preview loop', () => {
    expect(chooseExternalPreviewClipName(['Dead', 'Boom_Dance'])).toBe('Dead');
    expect(chooseExternalPreviewClipName([])).toBeNull();
  });
});
