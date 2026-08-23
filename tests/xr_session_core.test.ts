// Pure half of the WebXR groundwork (src/render/xr_session_core.ts): the
// ?xr=1 experiment gate, the session init options, and the entry visibility
// decision. The impure renderer/navigator wiring is tests/xr_session.test.ts.
import { describe, expect, it } from 'vitest';
import {
  vrEntryVisible,
  XR_QUERY_PARAM,
  XR_REFERENCE_SPACE,
  XR_SESSION_MODE,
  xrGateEnabled,
  xrSessionInit,
} from '../src/render/xr_session_core';

describe('xr session constants', () => {
  it('pins the wire-visible mode, reference space, and gate param', () => {
    // These reach the WebXR API and the URL surface; renaming them is a
    // player-visible behavior change, so pin the literals.
    expect(XR_SESSION_MODE).toBe('immersive-vr');
    expect(XR_REFERENCE_SPACE).toBe('local-floor');
    expect(XR_QUERY_PARAM).toBe('xr');
  });
});

describe('xrGateEnabled', () => {
  it('accepts exactly xr=1, with or without the leading question mark', () => {
    expect(xrGateEnabled('?xr=1')).toBe(true);
    expect(xrGateEnabled('xr=1')).toBe(true);
    expect(xrGateEnabled('?a=b&xr=1')).toBe(true);
    expect(xrGateEnabled('?xr=1&a=b')).toBe(true);
  });

  it('stays off for every other shape (strict experiment gate)', () => {
    expect(xrGateEnabled('')).toBe(false);
    expect(xrGateEnabled('?')).toBe(false);
    expect(xrGateEnabled('?xr=0')).toBe(false);
    expect(xrGateEnabled('?xr')).toBe(false);
    expect(xrGateEnabled('?xr=true')).toBe(false);
    expect(xrGateEnabled('?xr=11')).toBe(false);
    expect(xrGateEnabled('?XR=1')).toBe(false);
    expect(xrGateEnabled('?vr=1')).toBe(false);
    expect(xrGateEnabled('?prefix_xr=1')).toBe(false);
  });
});

describe('xrSessionInit', () => {
  it('requests local-floor as an OPTIONAL feature only', () => {
    const init = xrSessionInit();
    expect(init.optionalFeatures).toEqual([XR_REFERENCE_SPACE]);
    expect('requiredFeatures' in init).toBe(false);
  });

  it('returns a fresh object per call so callers cannot cross-contaminate', () => {
    const a = xrSessionInit();
    a.optionalFeatures.push('hand-tracking');
    expect(xrSessionInit().optionalFeatures).toEqual([XR_REFERENCE_SPACE]);
  });
});

describe('vrEntryVisible', () => {
  it('shows the entry only when the gate is on AND support is reported', () => {
    expect(vrEntryVisible(true, true)).toBe(true);
    expect(vrEntryVisible(true, false)).toBe(false);
    expect(vrEntryVisible(false, true)).toBe(false);
    expect(vrEntryVisible(false, false)).toBe(false);
  });
});
