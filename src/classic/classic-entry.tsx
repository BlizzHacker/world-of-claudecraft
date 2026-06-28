import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ClassicCrypticMount from './ClassicCrypticMount.jsx';

let root: Root | null = null;
let host: HTMLElement | null = null;

export function mountClassic(el: HTMLElement, opts?: { onExit?: () => void }): void {
  host = el;
  el.style.display = 'block';
  root = createRoot(el);
  flushSync(() => {
    root!.render(
      React.createElement(ClassicCrypticMount, {
        onExit: () => { opts?.onExit?.(); unmountClassic(); },
      }),
    );
  });
}

export function unmountClassic(): void {
  try { root?.unmount(); } catch { /* noop */ }
  root = null;
  if (host) { host.innerHTML = ''; host.style.display = 'none'; host = null; }
}
