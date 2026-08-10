import type { BrowserEngine } from './browser_env';

// iOS WebKit (the native app shell's WKWebView AND iOS Safari itself, same
// engine and per-tab WebContent-process memory ceiling) can terminate that
// process mid-scene-build on an Ultra/Advanced world entry on recent phones.
// The tab or the native shell then reloads back to the start screen before
// the in-game Options menu is ever reachable, so a persisted Ultra/Advanced
// choice traps the player in a repeated-reload loop with no way to back out.
// Pure so it unit-tests without a DOM; main.ts is the thin caller.
export function safeStartupGraphicsPreset(
  isNative: boolean,
  engine: BrowserEngine,
  mobile: boolean,
  preset: number,
  ultraPreset: number,
  highPreset: number,
  softwareGl = false,
  lowPreset = 1,
): number {
  // A software rasterizer (SwiftShader/WARP - hardware acceleration off or
  // blocklisted) cannot survive an Ultra entry either: the context is lost
  // mid-scene-build and the player gets a black world with a live HUD, with a
  // PERSISTED ultra re-springing the trap every entry. Same shape as the iOS
  // case below, but capped to LOW - software GL cannot drive HIGH either.
  if (softwareGl && preset > lowPreset) return lowPreset;
  const isIosWebkit = engine === 'webkit' && mobile;
  if ((isNative || isIosWebkit) && preset >= ultraPreset) return highPreset;
  return preset;
}
