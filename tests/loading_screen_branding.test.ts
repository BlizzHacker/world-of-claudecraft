// The loading curtain is realm-branded on EVERY path that shows it.
//
// There are two curtains over the same #loading-screen element: the delve
// transition one in src/game/loading_screen.ts, and the world-entry one in
// src/main.ts (which adds a progress reset, the slow-connection watch, and a
// reduced-motion fade). They drifted: only the delve curtain applied the realm
// art and the `art-has-wordmark` class, so entering the world stacked the
// overlay logo on top of loading art that already paints the wordmark. The
// fix made game/loading_screen.ts own the rule (applyLoadingArt) and main.ts
// consume it, and these tests pin both halves of that.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyLoadingArt } from '../src/game/loading_screen';
import {
  getActiveRealm,
  REALM_LIST,
  setActiveRealmForOffline,
  setRealmHostEnv,
} from '../src/sim/realms/registry';

const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

/** The art the stylesheet paints when a realm names no loadingScreenSrc. */
const CSS_DEFAULT_ART = '/cryptic-realm-loading-bg.webp';

describe('applyLoadingArt', () => {
  beforeEach(() => {
    setActiveRealmForOffline(null);
    setRealmHostEnv(null);
  });

  it('hides the overlay logo on every realm whose art already paints the wordmark', () => {
    for (const realm of REALM_LIST) {
      setActiveRealmForOffline(realm.id);
      const toggled: Record<string, boolean> = {};
      const stub = {
        style: { backgroundImage: '' },
        classList: {
          toggle: (name: string, on: boolean) => {
            toggled[name] = on;
          },
        },
      } as unknown as HTMLElement;
      applyLoadingArt(stub);

      const branding = getActiveRealm().branding;
      expect(toggled['art-has-wordmark']).toBe(branding?.loadingArtHasWordmark === true);
      // A realm that declares the wordmark art must actually hide the logo.
      if (branding?.loadingScreenSrc === CSS_DEFAULT_ART) {
        expect(toggled['art-has-wordmark']).toBe(true);
      }
    }
  });

  it('always decides the wordmark class, so a stale class never survives a realm switch', () => {
    // toggle() is called unconditionally (not only when the flag is true), or a
    // realm with plain art would inherit the previous realm's hidden logo.
    const wordmarkRealm = REALM_LIST.find((r) => r.branding?.loadingArtHasWordmark === true);
    const plainRealm = REALM_LIST.find(
      (r) => r.branding?.loadingScreenSrc && r.branding.loadingArtHasWordmark !== true,
    );
    expect(wordmarkRealm).toBeDefined();
    expect(plainRealm).toBeDefined();

    for (const [realm, expected] of [
      [wordmarkRealm, true],
      [plainRealm, false],
    ] as const) {
      setActiveRealmForOffline(realm?.id ?? null);
      const calls: Array<[string, boolean]> = [];
      const stub = {
        style: { backgroundImage: '' },
        classList: { toggle: (n: string, on: boolean) => calls.push([n, on]) },
      } as unknown as HTMLElement;
      applyLoadingArt(stub);
      expect(calls).toContainEqual(['art-has-wordmark', expected]);
    }
  });

  it('paints the realm art as the background so the CSS default cannot leak through', () => {
    const realm = REALM_LIST.find((r) => r.branding?.loadingScreenSrc);
    expect(realm).toBeDefined();
    setActiveRealmForOffline(realm?.id ?? null);
    const stub = {
      style: { backgroundImage: '' },
      classList: { toggle: () => {} },
    } as unknown as HTMLElement;
    applyLoadingArt(stub);
    expect(stub.style.backgroundImage).toContain(realm?.branding?.loadingScreenSrc);
  });
});

describe('the world-entry curtain in src/main.ts', () => {
  const mainSrc = read('src/main.ts');

  it('applies the shared realm art instead of re-deriving the branding rules', () => {
    // The bug: main.ts had its own showLoadingScreen that only toggled
    // visibility, so world entry never saw branding at all.
    expect(mainSrc).toContain('import { applyLoadingArt');
    const show = mainSrc.slice(
      mainSrc.indexOf('function showLoadingScreen('),
      mainSrc.indexOf('function setLoadingStatus('),
    );
    expect(show).toContain('applyLoadingArt(el)');
  });

  it('never re-implements the wordmark rule locally', () => {
    // Only the import site may name the class in main.ts; a second literal here
    // means the duplicate has grown back.
    const hits = mainSrc.match(/art-has-wordmark/g) ?? [];
    expect(hits.length).toBe(0);
  });

  it('rotates realm-flavoured loading tips like the delve curtain does', () => {
    expect(mainSrc).toContain('createLoadingTipRotation(getActiveRealm().id)');
  });
});
