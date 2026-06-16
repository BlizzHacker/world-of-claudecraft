// Game cursor PNGs live in public/ui/cursors/ (served from ./ui/cursors/ at runtime).

export type HoverCursorKind = 'default' | 'attack' | 'friendly';

const BASE = import.meta.env.BASE_URL;

function pngCursor(file: string, hotX: number, hotY: number, fallback: string): string {
  return `url("${BASE}ui/cursors/${file}") ${hotX} ${hotY}, ${fallback}`;
}

/** Default explore / interact cursor. */
export const CURSOR_HAND = pngCursor('hand-default.png', 12, 2, 'default');

/** Camera drag while mouse-look is enabled. */
export const CURSOR_GRAB = pngCursor('hand-grab.png', 11, 16, 'grabbing');

/** Hostile mob under the pointer. */
export const CURSOR_ATTACK = pngCursor('attack-sword.png', 4, 4, 'pointer');

/** Party members and friendly NPCs (merchants, quest givers). */
export const CURSOR_FRIENDLY = pngCursor('friendly-shield.png', 13, 30, 'default');

export function cursorForHover(kind: HoverCursorKind, draggingCamera: boolean): string {
  if (draggingCamera) return CURSOR_GRAB;
  switch (kind) {
    case 'attack': return CURSOR_ATTACK;
    case 'friendly': return CURSOR_FRIENDLY;
    default: return CURSOR_HAND;
  }
}
