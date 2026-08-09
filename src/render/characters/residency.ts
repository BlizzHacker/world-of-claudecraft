// Whether this device has a hard resident-memory ceiling (iOS WebKit, or a
// console browser sandbox). Set once from the graphics layer at startup.
//
// It lives here, in its own module, rather than being read off GFX, because
// manifest.ts is pure data and dispatch: it must not import the renderer, and
// gfx.ts pulls in three. One value, one setter, no cycle.

let bounded = false;

export function setBoundedResidency(value: boolean): void {
  bounded = value;
}

/** True when distinct-asset variety must be traded away to stay under a hard
 *  resident-memory ceiling. */
export function isBoundedResidency(): boolean {
  return bounded;
}
