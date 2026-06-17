import { describe, expect, it } from 'vitest';
import { REALMS, REALM_LIST } from '../src/sim/realms';

describe('realm branding overrides', () => {
  it('every realm exposes a branding block', () => {
    for (const realm of REALM_LIST) {
      expect(realm.branding).toBeTruthy();
    }
  });

  it('only the claudecraft realm shows the upstream Donate button', () => {
    for (const realm of REALM_LIST) {
      const showDonate = realm.branding?.showDonate === true;
      if (realm.id === 'claudecraft') {
        expect(showDonate).toBe(true);
      } else {
        expect(showDonate).toBe(false);
      }
    }
  });

  it('only the claudecraft realm advertises the upstream GitHub repo + Discord', () => {
    const claudecraft = REALMS.claudecraft.branding ?? {};
    expect(claudecraft.githubUrl).toContain('levy-street/world-of-claudecraft');
    expect(claudecraft.discordUrl).toContain('worldofclaudecraft');
    for (const id of ['infernal', 'classic', 'dominion', 'arcane'] as const) {
      const b = REALMS[id].branding ?? {};
      expect(b.githubUrl).toContain('BlizzHacker/cryptic-realm');
      expect(b.discordUrl).toContain('crypticrealm');
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
