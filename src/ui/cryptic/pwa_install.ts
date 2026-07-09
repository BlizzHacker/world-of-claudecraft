// PWA install prompt. Catches beforeinstallprompt, surfaces a banner with
// an "Install Cryptic Realm" button, persists user dismissal so we don't
// nag.
import './pwa_install.css';

let deferred: BeforeInstallPromptEvent | null = null;
const DISMISS_KEY = 'cr_pwa_dismissed';
const BANNER_ID = 'cr-pwa-banner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* noop */
  }
}

function renderBanner(): void {
  if (dismissed()) return;
  if (document.getElementById(BANNER_ID)) return;
  const el = document.createElement('div');
  el.id = BANNER_ID;
  el.className = 'cr-pwa-banner';
  el.innerHTML = `
    <div class="cr-pwa-text">
      <strong>Install Cryptic Realm</strong>
      <span>Pin the realm to your desktop / home screen for faster launch.</span>
    </div>
    <div class="cr-pwa-actions">
      <button type="button" id="cr-pwa-install">Install</button>
      <button type="button" id="cr-pwa-dismiss" class="cr-pwa-link">Not now</button>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#cr-pwa-install')?.addEventListener('click', async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') el.remove();
    if (outcome === 'dismissed') {
      rememberDismissed();
      el.remove();
    }
    deferred = null;
  });
  el.querySelector('#cr-pwa-dismiss')?.addEventListener('click', () => {
    rememberDismissed();
    el.remove();
  });
}

export function mountPwaInstall(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    deferred = ev as BeforeInstallPromptEvent;
    renderBanner();
  });
  // On iOS Safari there's no event; show a manual instruction banner.
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (isIos && !standalone && !dismissed()) {
    setTimeout(() => {
      if (document.getElementById(BANNER_ID)) return;
      const el = document.createElement('div');
      el.id = BANNER_ID;
      el.className = 'cr-pwa-banner';
      el.innerHTML = `
        <div class="cr-pwa-text">
          <strong>Install Cryptic Realm</strong>
          <span>Share → Add to Home Screen to pin it.</span>
        </div>
        <div class="cr-pwa-actions">
          <button type="button" id="cr-pwa-dismiss" class="cr-pwa-link">Got it</button>
        </div>
      `;
      document.body.appendChild(el);
      el.querySelector('#cr-pwa-dismiss')?.addEventListener('click', () => {
        rememberDismissed();
        el.remove();
      });
    }, 3000);
  }
}
