import { describe, expect, it } from 'vitest';
import {
  detectFacebookContext,
  FACEBOOK_CONTEXT_STORAGE_KEY,
  FACEBOOK_QUERY_PARAM,
  resolveFacebookAppContext,
} from '../src/game/facebook_context';

const none = { search: '', storedFlag: null, hasFbInstant: false };

describe('detectFacebookContext', () => {
  it('detects the shell query param with and without the leading question mark', () => {
    expect(detectFacebookContext({ ...none, search: '?fb=1' })).toBe(true);
    expect(detectFacebookContext({ ...none, search: 'fb=1' })).toBe(true);
    expect(detectFacebookContext({ ...none, search: '?realm=alpha&fb=1' })).toBe(true);
  });

  it('stays off outside the container', () => {
    expect(detectFacebookContext(none)).toBe(false);
    expect(detectFacebookContext({ ...none, search: '?fb=0' })).toBe(false);
    expect(detectFacebookContext({ ...none, search: '?fb=' })).toBe(false);
    expect(detectFacebookContext({ ...none, search: '?realm=alpha' })).toBe(false);
  });

  it('never confuses a Facebook click id for the shell param', () => {
    // Links shared on Facebook carry fbclid; only the shell's explicit fb=1
    // may flip the gate.
    expect(detectFacebookContext({ ...none, search: '?fbclid=AbCd123' })).toBe(false);
    expect(detectFacebookContext({ ...none, search: '?fb_source=feed' })).toBe(false);
  });

  it('honors the persisted session flag so SPA navigation keeps the context', () => {
    expect(detectFacebookContext({ ...none, storedFlag: '1' })).toBe(true);
    expect(detectFacebookContext({ ...none, storedFlag: '0' })).toBe(false);
    expect(detectFacebookContext({ ...none, storedFlag: 'yes' })).toBe(false);
  });

  it('honors an FBInstant global for a same-page boot', () => {
    expect(detectFacebookContext({ ...none, hasFbInstant: true })).toBe(true);
  });

  it('keeps the wire constants stable (the shell and storage depend on them)', () => {
    // facebook/index.html appends ?fb=1; renaming either constant breaks
    // deployed shells, so the literal is pinned.
    expect(FACEBOOK_QUERY_PARAM).toBe('fb');
    expect(FACEBOOK_CONTEXT_STORAGE_KEY).toBe('cr_facebook_shell');
  });
});

describe('resolveFacebookAppContext', () => {
  it('resolves false in a bare Node host without throwing', () => {
    // No location, no sessionStorage, no FBInstant global here.
    expect(resolveFacebookAppContext()).toBe(false);
  });
});
