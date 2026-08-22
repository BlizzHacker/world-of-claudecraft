// WebXR session entry, the thin impure half (Meta Quest lane,
// docs/meta-quest-release.md). Owns navigator.xr and the renderer.xr wiring;
// every decision it can make without a browser lives in xr_session_core.ts.
//
// Scope, deliberately narrow: this module ATTACHES an immersive-vr session to
// the three renderer (renderer.xr.enabled + setSession). It does NOT retarget
// the frame loop: main.ts still drives window.requestAnimationFrame, and
// per the WebXR spec the session's layer framebuffer is only writable inside
// the session's own animation frames, so headset presentation additionally
// needs the loop handed to renderer.setAnimationLoop while a session is live.
// That switch is the documented follow-up in docs/meta-quest-release.md; until
// it lands this stays groundwork behind the ?xr=1 gate.
import { XR_REFERENCE_SPACE, XR_SESSION_MODE, xrSessionInit } from './xr_session_core';

// Structural slice of THREE.WebGLRenderer so consumers (the ui entry button)
// and tests never need a real renderer or a three import.
export interface XrTargetRenderer {
  xr: {
    enabled: boolean;
    setReferenceSpaceType(type: XRReferenceSpaceType): void;
    setSession(session: XRSession): Promise<void>;
  };
}

function xrSystem(): XRSystem | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.xr;
}

// False on any failure: no navigator.xr (non-XR browser), a rejected or
// throwing isSessionSupported (permissions policy), or a false verdict.
export async function vrSupported(): Promise<boolean> {
  const xr = xrSystem();
  if (!xr) return false;
  try {
    return await xr.isSessionSupported(XR_SESSION_MODE);
  } catch {
    return false;
  }
}

let activeSession: XRSession | null = null;

export function activeVrSession(): XRSession | null {
  return activeSession;
}

// Requests an immersive-vr session and attaches it to the renderer. Must run
// from a user activation (a click) or the UA rejects the request. Returns the
// session, the already-active one on a double entry, or null on any failure;
// renderer.xr.enabled is restored to false when the session ends or the attach
// fails, so a failed or finished VR attempt leaves the renderer untouched.
export async function enterVr(renderer: XrTargetRenderer): Promise<XRSession | null> {
  if (activeSession) return activeSession;
  const xr = xrSystem();
  if (!xr) return null;
  let session: XRSession;
  try {
    session = await xr.requestSession(XR_SESSION_MODE, xrSessionInit());
  } catch {
    return null;
  }
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType(XR_REFERENCE_SPACE);
  session.addEventListener(
    'end',
    () => {
      activeSession = null;
      renderer.xr.enabled = false;
    },
    { once: true },
  );
  try {
    await renderer.xr.setSession(session);
  } catch {
    renderer.xr.enabled = false;
    activeSession = null;
    try {
      await session.end();
    } catch {
      // Already ended; nothing to release.
    }
    return null;
  }
  activeSession = session;
  return session;
}
