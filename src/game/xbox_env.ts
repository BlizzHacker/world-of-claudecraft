// Xbox console (Edge browser / hosted-app MSIX) environment shim.
//
// On Xbox, Edge initially maps the physical controller to a virtual mouse
// cursor and reserves B for browser-back. Once the page is fullscreen the
// browser hands the pad to the page, where the Gamepad API stack
// (gamepad.ts / gamepad_cursor.ts) takes over. Fullscreen needs user
// activation, so we arm one-shot listeners for the first click or keypress
// (the pad-as-mouse click qualifies) and re-arm whenever fullscreen drops.
//
// No new UI strings, no sim imports. Safe no-op everywhere but Xbox.

export function isXboxConsole(ua: string = navigator.userAgent): boolean {
  return /\bXbox\b/i.test(ua);
}

export function mountXboxEnv(): void {
  if (typeof document === 'undefined' || !isXboxConsole()) return;
  document.documentElement.classList.add('xbox-console');

  const enter = (): void => {
    disarm();
    const root = document.documentElement;
    if (!document.fullscreenElement && typeof root.requestFullscreen === 'function') {
      root.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
        // Denied (no activation yet): wait for the next gesture.
        arm();
      });
    }
  };

  const arm = (): void => {
    document.addEventListener('pointerdown', enter, { once: true, capture: true });
    document.addEventListener('keydown', enter, { once: true, capture: true });
  };
  const disarm = (): void => {
    document.removeEventListener('pointerdown', enter, true);
    document.removeEventListener('keydown', enter, true);
  };

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) arm();
  });
  arm();
}
