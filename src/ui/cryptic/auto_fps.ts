const AUTO_FPS_KEY = 'cr_auto_fps_on_zoom';

export function resolveAutoFps(): boolean {
  try { return window.localStorage?.getItem(AUTO_FPS_KEY) === 'on'; } catch { return false; }
}

export function persistAutoFps(on: boolean): void {
  try { window.localStorage?.setItem(AUTO_FPS_KEY, on ? 'on' : 'off'); } catch { /* noop */ }
}

