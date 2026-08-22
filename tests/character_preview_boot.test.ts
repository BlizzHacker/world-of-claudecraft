import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

// The bug: the landing character-creation preview was gated on the site-wide
// assetsReady() promise with no failure handler. That promise covers EVERY
// registered preload (terrain, dungeon, foliage, character GLBs, ...), so a
// single transient failure ANYWHERE permanently sank the character preview
// with zero retry, most likely on a cold, first-visit cache (no warm HTTP
// cache to mask a flaky fetch). charactersReady() is the narrower fix: it
// only waits on character-boot assets and retries whatever is still missing,
// since loadGltf/loadTexture evict a failed URL from their cache on
// rejection, making a fresh call a real re-fetch attempt.
function mockGltfLoad(failFirstNCalls: number): { calls: Map<string, number> } {
  const calls = new Map<string, number>();
  vi.doMock('../src/render/assets/loader', () => ({
    loadGltf: vi.fn((url: string) => {
      const n = (calls.get(url) ?? 0) + 1;
      calls.set(url, n);
      if (n <= failFirstNCalls) return Promise.reject(new Error(`transient failure: ${url}`));
      return Promise.resolve({ scene: {}, animations: [] });
    }),
    loadHdr: vi.fn(() => new Promise(() => undefined)),
    loadTexture: vi.fn(() => Promise.resolve({})),
    releaseGltf: vi.fn(),
  }));
  return { calls };
}

describe('character preview boot (first-visit transient asset failure)', () => {
  it('retries a failed character GLB and eventually resolves', async () => {
    vi.resetModules();
    const { calls } = mockGltfLoad(1); // every URL fails once, then succeeds
    const { charactersReady } = await import('../src/render/characters/assets');

    await expect(charactersReady(3)).resolves.toBeUndefined();
    // Decisive on the actual readiness check (gltfByUrl.has(assetUrl(u))): every
    // URL must have been retried exactly twice (the initial failure plus the one
    // retry that succeeds), never zero (which would mean the loop fell out
    // without actually resolving anything) and never three (which would mean
    // the early-return on an empty missing set regressed and kept re-fetching
    // URLs that were already cached).
    expect(calls.size).toBeGreaterThan(0);
    for (const count of calls.values()) expect(count).toBe(2);
  });

  it('rejects once every attempt is exhausted, instead of hanging forever', async () => {
    vi.resetModules();
    mockGltfLoad(Number.POSITIVE_INFINITY); // every URL always fails
    const { charactersReady } = await import('../src/render/characters/assets');

    await expect(charactersReady(2)).rejects.toThrow(/character preview assets failed to load/);
  });

  // The boot-time mount was fixed first; the LAZY mount (ensureCharacterPreview,
  // which the create/offline panels hit the moment they open) kept awaiting the
  // site-wide assetsReady(), so it still waited on terrain/dungeon/foliage it
  // never draws and still sank on any unrelated preload failure. main.ts cannot
  // be imported in Node (it boots the client at import), so pin the gate at the
  // source level: the function must await the narrow charactersReady() and must
  // not touch assetsReady at all.
  it('ensureCharacterPreview gates on the narrow charactersReady(), never assetsReady()', () => {
    const mainSrc = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/main.ts'),
      'utf8',
    );
    const start = mainSrc.indexOf('async function ensureCharacterPreview');
    expect(start, 'ensureCharacterPreview must exist in src/main.ts').toBeGreaterThan(-1);
    // Slice the function body by brace matching from its opening brace.
    const open = mainSrc.indexOf('{', start);
    let depth = 0;
    let end = open;
    for (let i = open; i < mainSrc.length; i++) {
      if (mainSrc[i] === '{') depth++;
      else if (mainSrc[i] === '}' && --depth === 0) {
        end = i;
        break;
      }
    }
    const body = mainSrc.slice(open, end + 1);
    expect(body).toContain('await charactersReady()');
    // No call, await, or destructure of the site-wide gate anywhere in the
    // body (the word may appear in a comment; a use is what regresses).
    expect(body).not.toMatch(/assetsReady\s*\(|\{[^}]*\bassetsReady\b[^}]*\}\s*=/);
  });
});
