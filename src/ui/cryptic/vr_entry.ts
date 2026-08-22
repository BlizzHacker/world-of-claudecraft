// Hidden VR entry button (Meta Quest groundwork, docs/meta-quest-release.md).
// Mounts a small overlay button that requests an immersive-vr WebXR session
// for the running renderer. INERT BY DEFAULT: it renders nothing unless the
// URL carries the ?xr=1 experiment gate AND the browser reports immersive-vr
// support (Quest Browser); every other player sees zero change. Sibling of
// pwa_install.ts and follows the same self-contained conventions.
import './vr_entry.css';
import { enterVr, vrSupported, type XrTargetRenderer } from '../../render/xr_session';
import { vrEntryVisible, xrGateEnabled } from '../../render/xr_session_core';

const BUTTON_ID = 'cr-vr-entry';

// Called from startGame once the renderer exists; the getter stays live across
// renderer rebuilds (main.ts reassigns its renderer binding on a graphics
// profile swap, and the closure reads the current one at click time).
export function mountVrEntry(getRenderer: () => XrTargetRenderer | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!xrGateEnabled(window.location.search)) return;
  void vrSupported().then((supported) => {
    if (!vrEntryVisible(true, supported)) return;
    if (document.getElementById(BUTTON_ID)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = BUTTON_ID;
    btn.className = 'cr-vr-entry';
    btn.textContent = 'Enter VR';
    btn.addEventListener('click', () => {
      const renderer = getRenderer();
      if (!renderer) return;
      btn.disabled = true;
      void enterVr(renderer).then((session) => {
        if (!session) {
          btn.disabled = false;
          return;
        }
        btn.hidden = true;
        session.addEventListener(
          'end',
          () => {
            btn.hidden = false;
            btn.disabled = false;
          },
          { once: true },
        );
      });
    });
    document.body.appendChild(btn);
  });
}
