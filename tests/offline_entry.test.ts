// The offline lane, end to end at the seam it actually turns on.
//
// Offline is a SOLD feature on this fork (offline_mode_gate.test.ts), and it has
// three promises the recent wave2 work could each have broken: it needs no
// account, it needs no network for gameplay, and it reaches a playable world.
// The wave2 worldThemes now scale and spread every procedural building for the
// realm the player picked, and startOffline installs that pick BEFORE it builds
// the Sim, so the offline world every realm boots is a themed copy of the
// built-in one (data.ts getActiveWorldContent) rather than BUILTIN_WORLD itself.
// A realm whose theme wedged world construction would take the whole offline
// lane down for that realm only, which no online suite would notice.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getActiveWorldContent, isBuiltinWorldContent } from '../src/sim/data';
import {
  getActiveRealm,
  REALM_LIST,
  setActiveRealmForOffline,
  setRealmHostEnv,
} from '../src/sim/realms/registry';
import { Sim } from '../src/sim/sim';
import { WORLD_SEED } from '../src/sim/world_seed';

const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

afterEach(() => {
  setActiveRealmForOffline(null);
  setRealmHostEnv(null);
});

describe('offline entry reaches a playable world on every realm', () => {
  for (const realm of REALM_LIST) {
    it(`boots ${realm.id} the way startOffline does`, () => {
      // The pick IS the offline session's realm context, installed before
      // anything realm-derived runs (src/main.ts startOffline).
      setActiveRealmForOffline(realm.id);
      expect(getActiveRealm().id).toBe(realm.id);

      // The themed copy still counts as the shipped built-in world, or the town
      // kits stop rendering while their colliders stay registered.
      const world = getActiveWorldContent();
      expect(isBuiltinWorldContent(world)).toBe(true);
      expect(world.zones.length).toBeGreaterThan(0);
      expect(world.props.buildings.length).toBeGreaterThan(0);

      const sim = new Sim({
        seed: WORLD_SEED,
        playerClass: 'warrior',
        playerName: 'Adventurer',
        riftPortals: true,
        valeCupShowcase: true,
      });

      // Playable: a live player at full health with a world around them.
      expect(sim.player.hp).toBeGreaterThan(0);
      expect(sim.player.hp).toBe(sim.player.maxHp);
      expect(sim.player.level).toBeGreaterThanOrEqual(1);
      expect(sim.entities.size).toBeGreaterThan(1);
      expect(Number.isFinite(sim.player.pos.x)).toBe(true);
      expect(Number.isFinite(sim.player.pos.z)).toBe(true);

      // And it keeps running: a themed footprint that trapped the spawn would
      // show up as a player who cannot be ticked without throwing.
      for (let i = 0; i < 20; i += 1) sim.tick();
      expect(sim.player.hp).toBeGreaterThan(0);
    });
  }
});

describe('offline entry needs no account and no game server', () => {
  const main = read('src/main.ts');
  // The body only: a top-level `}` in column 0 is this function's own close, so
  // the slice cannot spill into the module scope below it (where `api` lives).
  const startOfflineAt = main.indexOf('async function startOffline(');
  const startOffline = main.slice(startOfflineAt, main.indexOf('\n}\n', startOfflineAt));

  it('reads the whole startOffline body, so the negative pins below are not vacuous', () => {
    expect(startOffline.length).toBeGreaterThan(2000);
    expect(startOffline).toContain('const { Sim } = await loadGameRuntime();');
    // The last statement of the function, so the slice provably spans it.
    expect(startOffline).toContain('void startGame(sim, sim, null,');
  });

  it('never touches the auth client, so no token gates the lane', () => {
    // A stray api.* call here would make offline fail for a signed-out player
    // exactly the way the online lane does, which is the whole point of offline.
    expect(startOffline).not.toMatch(/\bapi\.\w/);
    expect(startOffline).not.toContain('hydrateApiFromSavedSession');
    expect(startOffline).not.toContain('readCrypticSession');
  });

  it('opens no world socket: the local Sim is the authority', () => {
    expect(startOffline).not.toContain('new ClientWorld');
    expect(startOffline).not.toContain('WebSocket');
  });

  it('treats the realm visual fetch as optional, so a dead network still enters', () => {
    // The published realm bodies are a RENDERING nicety; offline must not hang
    // or bail when that request fails (a server blip, or no network at all).
    expect(startOffline).toContain(
      'await ensureRealmVisualOverridesLoaded(getActiveRealm().id).catch(() => false);',
    );
  });
});

describe('the world selector routes Offline without a login step', () => {
  const main = read('src/main.ts');
  const index = read('index.html');

  it('ships the Offline option in the landing selector', () => {
    expect(index).toContain('id="server-opt-offline"');
    expect(index).toContain('id="offline-select"');
    expect(index).toContain('id="btn-start-offline"');
  });

  it('commits Play straight to the offline creator, never to the login panel', () => {
    expect(main).toContain(
      "btnPlay.addEventListener('click', () => {\n      if (serverMode === 'offline') handleOfflineSelect();\n      else handleOnlineSelect();\n    });",
    );
  });

  it('opens the creator with no session check in handleOfflineSelect', () => {
    const handler = main.slice(
      main.indexOf('const handleOfflineSelect = () => {'),
      main.indexOf('onlineBtn.addEventListener('),
    );
    expect(handler).toContain("show('#offline-select');");
    expect(handler).not.toMatch(/\bapi\.token\b/);
    expect(handler).not.toContain("show('#login-panel')");
  });
});
