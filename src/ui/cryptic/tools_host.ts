// Shared floating host for the fork's in-game reference tools (Monster
// Chronicle, Skill Trees, Loot Vault, Pickit Filter).
//
// History: these launchers originally lived in the #cr-bestiary-host div inside
// the landing's #realm-panel. Commit 7f2439e84a moved their mounts into
// main.ts startGame() and removed that div, so every mount fell back to
// document.body — static flow at the page's top-left, where the fixed
// full-viewport #game-canvas (z-index:0, src/styles/base.css) paints over
// non-positioned body children the moment the first frame renders. The buttons
// existed and their handlers worked, but they only flashed while the canvas
// was still blank during loading, then vanished for the whole session.
//
// This host restores a real in-game surface: a fixed toolbar at the top-left
// (the one HUD-free corner: minimap is top-right, chat bottom-left, action
// bars bottom-center, micro-menu on the right edge), layered above the canvas
// but below the HUD's windows (z-index 21+) and the tool modals (z-index 200),
// so an opened bag/map window still covers it rather than the reverse.

const HOST_ID = 'cr-tools-host';
const STYLE_ID = 'cr-tools-host-style';

const STYLE = `
  #${HOST_ID} { position:fixed; top:calc(10px + env(safe-area-inset-top, 0px)); left:calc(10px + env(safe-area-inset-left, 0px)); z-index:5; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  /* The tools only mean anything in the world: startGame() mounts them, and if
     the player ever gets back to the landing chrome the toolbar must not
     linger over it. */
  body:not(.game-active) #${HOST_ID} { display:none; }
  /* The mobile touch HUD owns the screen edges; parking a toolbar there would
     sit over the touch controls. The tools were never reachable on mobile on
     this line (their pre-7f2439e84a home was the desktop realm panel), so
     hiding here regresses nothing and holds until they get a mobile entry
     point. */
  body.mobile-touch #${HOST_ID} { display:none; }
`;

/** Return the shared floating toolbar the in-game reference tools mount their
 *  launcher buttons into, creating it (and its stylesheet) on first use. */
export function ensureToolsHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (host) return host;
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = STYLE;
    document.head.appendChild(s);
  }
  host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  return host;
}
