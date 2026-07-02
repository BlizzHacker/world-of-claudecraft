// Replays a captured LIVE wire session (hello + snap) through the real
// ClientWorld message handler, asserting the local player materializes —
// exactly the condition main.ts's 10s enter-world poll waits for.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.stubGlobal('WebSocket', class { close() {} send() {} } as any);

import { ClientWorld } from '../src/net/online';

const cap = JSON.parse(readFileSync('tmp/live_capture.json', 'utf8'));

describe('live wire replay', () => {
  it('applies hello + snap and materializes the local player entity', () => {
    const w = new ClientWorld('t'.repeat(64), cap.charId, 'mage', 'https://example.invalid', '') as any;
    for (const m of cap.msgs) {
      (w as any).onMessage(JSON.stringify(m));
    }
    expect(w.playerId).toBeGreaterThan(0);
    expect(w.entities.has(w.playerId)).toBe(true);
  });
});
