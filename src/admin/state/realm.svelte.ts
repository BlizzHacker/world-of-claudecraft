import { parseRealmDirectory, switchableRealms } from '../realm_directory';

// Reactive realm directory behind the shell's realm badge and switcher, loaded
// once from the public GET /api/realms (no admin token needed, so the badge
// renders for every staff role; the overview payload also carries the realm,
// but that read is analytics.read-gated). A failed load leaves the empty
// directory and the badge simply stays hidden.
class RealmState {
  current = $state<string>('');
  switchable = $state<{ name: string; adminUrl: string }[]>([]);
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const res = await fetch('/api/realms');
      if (!res.ok) return;
      const dir = parseRealmDirectory(await res.json());
      this.current = dir.current;
      this.switchable = switchableRealms(dir);
    } catch {
      /* server unreachable: keep the badge hidden */
    }
  }
}

export const realm = new RealmState();
