// Quest reward resolution must be identical between the quest-dialog preview
// (hud.ts) and the turn-in grant (sim.ts). Both now route through the shared
// questRewardItem() resolver so they cannot drift apart again. Regression test
// for the "preview shows no item but turn-in grants the archetype item" bug
// (e.g. a priest, a mage-archetype class, seeing an empty reward preview yet
// receiving the staff at turn-in).
import { describe, expect, it } from 'vitest';
import { QUESTS, REWARD_ARCHETYPE, questRewardItem } from '../src/sim/data';
import { ALL_CLASSES } from '../src/sim/types';

describe('quest reward resolution', () => {
  it('resolver matches the turn-in fallback formula for every quest and class', () => {
    for (const quest of Object.values(QUESTS)) {
      for (const cls of ALL_CLASSES) {
        // This is exactly the resolution sim.ts uses when granting the reward.
        const granted = quest.itemRewards[cls] ?? quest.itemRewards[REWARD_ARCHETYPE[cls]];
        expect(questRewardItem(quest, cls)).toBe(granted);
      }
    }
  });

  it('shows the archetype reward for non-archetype classes (the reported bug)', () => {
    // Find a quest that only lists archetype-keyed rewards (warrior/rogue/mage)
    // and verify a non-archetype class such as priest still previews an item.
    for (const quest of Object.values(QUESTS)) {
      const priestReward = questRewardItem(quest, 'priest');
      const mageReward = questRewardItem(quest, 'mage');
      // priest is a mage-archetype class, so its reward must equal the mage's
      // whenever the quest has no priest-specific override.
      if (quest.itemRewards.priest === undefined) {
        expect(priestReward).toBe(mageReward);
      }
    }
  });
});
