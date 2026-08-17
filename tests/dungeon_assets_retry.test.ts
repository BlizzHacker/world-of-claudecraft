// The dungeon kit loader must never memoize a FAILED batch. One transient fetch
// error used to cache a rejected promise in ensureDungeonAssets forever: every
// later dungeon/delve/arena/building-interior build got the same rejection back
// for the rest of the session, and the player stood in a flat fog void with no
// walls or floor (the live Candlebrook chapel report). A failed batch must open
// a short backoff and then retry from a fresh promise.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadGltf = vi.fn<(url: string) => Promise<unknown>>();
vi.mock("../src/render/assets/loader", () => ({
  loadGltf: (url: string) => loadGltf(url),
  releaseGltf: () => {},
}));

describe("ensureDungeonAssets retryability", () => {
  beforeEach(() => {
    vi.resetModules();
    loadGltf.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a failed batch is not memoized: after the backoff a new attempt hits the network again", async () => {
    loadGltf.mockRejectedValue(new Error("network down"));
    const { ensureDungeonAssets } = await import("../src/render/dungeon");

    await expect(ensureDungeonAssets()).rejects.toThrow("network down");
    const firstAttemptFetches = loadGltf.mock.calls.length;
    expect(firstAttemptFetches).toBeGreaterThan(0); // the kit fan-out really ran

    // Inside the backoff window: rejected fast, WITHOUT refiring the fan-out.
    await expect(ensureDungeonAssets()).rejects.toThrow();
    expect(loadGltf.mock.calls.length).toBe(firstAttemptFetches);

    // Past the backoff: a genuinely fresh attempt (the old bug returned the
    // first rejection forever and never touched the network again).
    vi.setSystemTime(Date.now() + 10_000);
    await expect(ensureDungeonAssets()).rejects.toThrow("network down");
    expect(loadGltf.mock.calls.length).toBe(firstAttemptFetches * 2);
  });

  it("while a batch is in flight, callers share the one promise (no duplicate fan-out)", async () => {
    let release: (() => void) | null = null;
    loadGltf.mockImplementation(
      () =>
        new Promise((_res, rej) => {
          release ??= () => rej(new Error("late failure"));
        }),
    );
    const { ensureDungeonAssets } = await import("../src/render/dungeon");

    const a = ensureDungeonAssets();
    const b = ensureDungeonAssets();
    expect(b).toBe(a); // memoized while pending
    const fetches = loadGltf.mock.calls.length;
    expect(fetches).toBeGreaterThan(0);
    release!();
    await expect(a).rejects.toThrow("late failure");
    expect(loadGltf.mock.calls.length).toBe(fetches); // no extra fan-out from b
  });
});
