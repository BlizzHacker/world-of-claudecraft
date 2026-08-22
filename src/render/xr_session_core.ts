// WebXR session groundwork, the pure half (Meta Quest lane, docs/meta-quest-release.md).
// Decides when the hidden VR entry is armed and what an immersive-vr session
// request carries. Host-free by contract (registered in RENDER_PURE_CORES):
// the thin consumer (xr_session.ts) owns navigator.xr and the three renderer.
//
// INERT BY DEFAULT: the whole VR path hangs off xrGateEnabled, an explicit
// ?xr=1 experiment flag. Without it nothing mounts, nothing touches the
// renderer, and non-VR players see zero change.

// The one session mode this lane requests. Quest Browser exposes it via the
// standard WebXR API (navigator.xr.isSessionSupported / requestSession).
export const XR_SESSION_MODE = 'immersive-vr' as const;

// Standing-scale play: local-floor puts the origin at the estimated floor, the
// right default for a third-person MMO camera. Requested as an OPTIONAL
// feature so session creation still succeeds on a viewer that only offers
// 'local' (three falls back through its reference-space request the same way).
export const XR_REFERENCE_SPACE = 'local-floor' as const;

export const XR_QUERY_PARAM = 'xr';

// Strict '=1' match: this is an experiment gate, not a public switch, so no
// truthy aliases ('on', 'true') and no bare-key form. Accepts a location.search
// with or without the leading '?'.
export function xrGateEnabled(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (query === '') return false;
  return query.split('&').some((pair) => pair === `${XR_QUERY_PARAM}=1`);
}

// Fresh object per call so a caller (or the UA) mutating the init cannot leak
// into the next request.
export function xrSessionInit(): { optionalFeatures: string[] } {
  return { optionalFeatures: [XR_REFERENCE_SPACE] };
}

// The entry button renders only when the gate is on AND the UA reported
// immersive-vr support; either alone keeps the surface hidden.
export function vrEntryVisible(gateEnabled: boolean, supported: boolean): boolean {
  return gateEnabled && supported;
}
