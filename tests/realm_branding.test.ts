import { describe, expect, it } from 'vitest';
import { REALMS, REALM_LIST } from '../src/sim/realms';

describe('realm branding overrides', () => {
  it('every realm exposes a branding block', () => {
    for (const realm of REALM_LIST) {
      expect(realm.branding).toBeTruthy();
    }
  });

  it('only the claudecraft realm shows the upstream Donate button (Exchange opts out)', () => {
    for (const realm of REALM_LIST) {
      const showDonate = realm.branding?.showDonate === true;
      if (realm.id === 'claudecraft') {
        expect(showDonate).toBe(true);
      } else {
        expect(showDonate).toBe(false);
      }
    }
  });

  it('claudecraft points at the upstream WoC GitHub; themed realms point at BlizzHacker', () => {
    const claudecraft = REALMS.claudecraft.branding ?? {};
    expect(claudecraft.githubUrl).toContain('levy-street/world-of-claudecraft');
    // All five realms share the same Discord invite (the one from the
    // BlizzHacker README) — there's no separate WoC server. Discord is the
    // community, not the realm.
    for (const realm of REALM_LIST) {
      expect(realm.branding?.discordUrl).toBe('https://discord.gg/GjhnUsBtw');
    }
    for (const id of ['infernal', 'classic', 'dominion', 'arcane'] as const) {
      const b = REALMS[id].branding ?? {};
      expect(b.githubUrl).toContain('BlizzHacker/cryptic-realm');
    }
  });

  it('themed realms hide the upstream Authentik SSO toggle off by default', () => {
    // claudecraft keeps the pristine upstream login UI — no SSO button.
    expect(REALMS.claudecraft.branding?.showAuthentikSso).toBe(false);
    for (const id of ['infernal', 'classic', 'dominion', 'arcane'] as const) {
      expect(REALMS[id].branding?.showAuthentikSso).toBe(true);
    }
  });

  it('every themed realm pack ships a non-default brand text', () => {
    for (const id of ['infernal', 'classic', 'dominion', 'arcane'] as const) {
      const text = REALMS[id].branding?.brandText ?? '';
      expect(text).toContain('Cryptic Realm');
      expect(text.toLowerCase()).not.toContain('claudecraft');
    }
  });
});
