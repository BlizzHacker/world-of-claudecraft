import { mountRealmBranding } from './ui/cryptic/branding';

let appPromise: Promise<typeof import('./main')> | null = null;
let caCopyResetTimer: number | null = null;

function loadApp(): Promise<typeof import('./main')> {
  appPromise ??= import('./main');
  return appPromise;
}

function bootLandingBranding(): void {
  mountRealmBranding();
}

function wireContractAddressCopy(): void {
  const btn = document.getElementById('btn-copy-ca');
  const container = document.getElementById('token-ca');
  if (!btn || !container) return;

  const showCopied = () => {
    container.classList.add('is-copied');
    if (caCopyResetTimer !== null) window.clearTimeout(caCopyResetTimer);
    caCopyResetTimer = window.setTimeout(() => {
      container.classList.remove('is-copied');
      caCopyResetTimer = null;
    }, 1800);
  };

  const fallbackCopy = (text: string): boolean => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  };

  btn.addEventListener('click', () => {
    const ca = btn.getAttribute('data-ca');
    if (!ca) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(ca).then(showCopied).catch(() => {
        if (fallbackCopy(ca)) showCopied();
      });
    } else if (fallbackCopy(ca)) {
      showCopied();
    }
  });
}

const APP_TRIGGER_SELECTOR = [
  '#btn-online',
  '#btn-offline',
  '#btn-login',
  '#btn-register',
  '#btn-change-realm',
  '.mini-class',
  '.auth-tab',
].join(',');

const PANELS = ['#mode-select', '#login-panel', '#realm-panel', '#charselect-panel', '#offline-select'];

function showPanel(selector: string): void {
  for (const id of PANELS) {
    const el = document.querySelector<HTMLElement>(id);
    if (!el) continue;
    const isTarget = id === selector;
    el.toggleAttribute('hidden', !isTarget);
    el.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
  }
  document.body.dataset.startPanel = selector.slice(1);
  const logoImg = document.getElementById('title-logo');
  if (logoImg) logoImg.toggleAttribute('hidden', selector === '#charselect-panel' || selector === '#offline-select');
}

function wireLandingPanels(): void {
  document.getElementById('nav-btn-play')?.addEventListener('click', () => showPanel('#mode-select'));
  document.getElementById('nav-btn-login')?.addEventListener('click', () => showPanel('#login-panel'));
  document.getElementById('btn-play')?.addEventListener('click', () => {
    const mode = document.getElementById('server-select')?.dataset.mode ?? 'online';
    if (mode === 'offline') {
      void loadApp().then(() => window.setTimeout(() => document.getElementById('btn-offline')?.click()));
      return;
    }
    showPanel('#login-panel');
  });

  const trigger = document.getElementById('server-select-trigger');
  const menu = document.getElementById('server-select-menu');
  trigger?.addEventListener('click', () => {
    if (!menu) return;
    const open = menu.hasAttribute('hidden');
    menu.toggleAttribute('hidden', !open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.querySelectorAll<HTMLElement>('.server-select-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const mode = opt.dataset.mode === 'offline' ? 'offline' : 'online';
      const root = document.getElementById('server-select');
      const value = document.getElementById('server-select-value');
      root?.setAttribute('data-mode', mode);
      if (value) value.textContent = mode === 'offline' ? 'Offline' : 'Online';
      document.querySelectorAll<HTMLElement>('.server-select-option').forEach((el) => {
        const selected = el === opt;
        el.classList.toggle('is-selected', selected);
        el.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      menu?.toggleAttribute('hidden', true);
      trigger?.setAttribute('aria-expanded', 'false');
    });
  });

  document.getElementById('btn-login-back')?.addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('#mode-select');
  });
}

function wireDeferredAppLoad(): void {
  document.addEventListener('click', (event) => {
    if (appPromise) return;
    const target = event.target instanceof Element
      ? targetClosest(event.target, APP_TRIGGER_SELECTOR)
      : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void loadApp().then(() => {
      window.setTimeout(() => target.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })));
    });
  }, true);
}

function targetClosest(el: Element, selector: string): HTMLElement | null {
  const match = el.closest(selector);
  return match instanceof HTMLElement ? match : null;
}

function boot(): void {
  bootLandingBranding();
  wireContractAddressCopy();
  wireLandingPanels();
  wireDeferredAppLoad();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
