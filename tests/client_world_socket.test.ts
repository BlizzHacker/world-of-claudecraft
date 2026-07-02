// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientWorld } from '../src/net/online';

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  binaryType = '';
  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.onclose?.();
  }
}

describe('ClientWorld socket wiring', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeWebSocket.instances.length = 0;
  });

  it('routes WebSocket frames through the live message handler', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const world = new ClientWorld('a'.repeat(64), 42, 'mage', 'https://realm.example', 'seed');
    const socket = FakeWebSocket.instances[0];

    expect(socket.url).toBe('wss://realm.example/ws');
    expect(typeof socket.onmessage).toBe('function');

    socket.onmessage?.({ data: JSON.stringify({ t: 'hello', pid: 42, seed: 20061 }) });
    socket.onmessage?.({
      data: JSON.stringify({
        t: 'snap',
        ents: [],
        self: {
          id: 42,
          k: 'player',
          tid: 'mage',
          nm: 'Socketmage',
          lv: 1,
          x: 1,
          y: 0,
          z: 2,
          f: 0,
          hp: 50,
          mhp: 50,
          res: 100,
          mres: 100,
          rtype: 'mana',
        },
      }),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(world.connected).toBe(true);
    expect(world.playerId).toBe(42);
    expect(world.entities.has(42)).toBe(true);
    world.close();
  });
});
