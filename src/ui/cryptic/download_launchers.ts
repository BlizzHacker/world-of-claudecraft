// Download surface for launcher status. The shipped client is the web client.
// Windows has signed-less Alpha installers (Lite/Medium) hosted on crypticrealm.com;
// other desktop/mobile targets show their status until binaries are published.
// No links point at the (private) source repo.

const HOST_ID = 'cr-download-launchers';

// Store listing URLs. An empty string means the listing is not live yet, and
// the Store listings grid renders that store as a disabled badge until the
// constant is filled in with the public URL.
export const MICROSOFT_STORE_URL = '';
// https://play.google.com/apps/testing/com.crypticrealm when live
export const PLAY_TESTING_URL = '';
export const STEAM_STORE_URL = '';
// https://chromewebstore.google.com/detail/mcgndfbilbedhiaohacplddaiomdpfai once
// the pending review publishes
export const CHROME_WEB_STORE_URL = '';

// One row of the Store listings grid (the second grid under the launcher
// cards). `url` empty renders the disabled "listing pending" badge.
export interface StoreListing {
  id: string;
  label: string;
  badge: string;
  url: string;
  meta: string;
}

export const STORE_LISTINGS: StoreListing[] = [
  {
    id: 'microsoft-store',
    label: 'Microsoft Store',
    badge: 'MS',
    url: MICROSOFT_STORE_URL,
    meta: 'Windows + Xbox',
  },
  {
    id: 'google-play',
    label: 'Google Play',
    badge: 'GP',
    url: PLAY_TESTING_URL,
    meta: 'closed testing track',
  },
  { id: 'steam', label: 'Steam', badge: 'STM', url: STEAM_STORE_URL, meta: 'desktop client' },
  {
    id: 'chrome-web-store',
    label: 'Chrome Web Store',
    badge: 'CWS',
    url: CHROME_WEB_STORE_URL,
    meta: 'browser app',
  },
];

/** HTML for one Store listings entry: a link when the listing URL is live, a
 *  disabled badge while the constant is still empty. Pure, exported for the
 *  paired test. */
export function storeCardHtml(s: StoreListing): string {
  if (!s.url) {
    return `
    <span class="cr-dl-btn cr-dl-disabled" data-store="${s.id}" aria-disabled="true">
      <span>${s.badge} ${s.label}</span><small>listing pending</small>
    </span>`;
  }
  return `
    <a class="cr-dl-btn" data-store="${s.id}" href="${s.url}" target="_blank" rel="noopener noreferrer">
      <span>${s.badge} ${s.label}</span><small>${s.meta}</small>
    </a>`;
}

// A single action button (primary, secondary, or one of the Windows tiers).
interface DlAction {
  label: string;
  href: string;
  meta: string;
  track?: boolean; // dimmer "tracking"/secondary styling
}

export interface Launcher {
  os: 'web' | 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'steam';
  label: string;
  badge: string;
  // Either a primary (+optional secondary) action, OR a multi-button `actions`
  // list (used by the Windows Lite/Medium/Heavy tiers).
  primaryLabel?: string;
  primaryHref?: string;
  primaryMeta?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryMeta?: string;
  actions?: DlAction[];
  status: string;
}

export const LAUNCHERS: Launcher[] = [
  {
    os: 'web',
    label: 'Web Client',
    badge: 'WEB',
    primaryLabel: 'Play Now',
    primaryHref: '/',
    primaryMeta: 'browser client',
    status: 'Live now. This is the canonical client until signed installers are published.',
  },
  {
    os: 'steam',
    label: 'Steam',
    badge: 'STM',
    primaryLabel: 'Play Web',
    primaryHref: '/',
    primaryMeta: 'works today',
    status: 'Steam build packaging is in progress; the store page is pending approval.',
  },
  {
    os: 'windows',
    label: 'Windows 10/11',
    badge: 'WIN',
    actions: [
      {
        label: 'Download · Lite',
        href: '/downloads/CrypticRealm-Setup-Lite.exe',
        meta: '~2 MB · recommended',
      },
      {
        label: 'Download · Full',
        href: '/downloads/CrypticRealm-Setup-Medium.exe',
        meta: '~333 MB · offline installer',
        track: true,
      },
      {
        label: 'Download · Heavy',
        href: '/downloads/CrypticRealm-Setup-Heavy.exe',
        meta: '~890 MB · complete offline game',
        track: true,
      },
    ],
    status:
      'Alpha · experimental · not yet code-signed, so Windows SmartScreen will warn. Click "More info", then "Run anyway", then run the installer. Lite downloads the small runtime on first install; Full bundles the client for offline install; Heavy bundles the complete game with every model, texture, and soundtrack for fully offline play.',
  },
  {
    os: 'macos',
    label: 'macOS 12+',
    badge: 'MAC',
    primaryLabel: 'Play Web',
    primaryHref: '/',
    primaryMeta: 'works today',
    status: 'A signed macOS app is in the build pipeline; use the web client for now.',
  },
  {
    os: 'linux',
    label: 'Linux x86_64',
    badge: 'LIN',
    primaryLabel: 'Play Web',
    primaryHref: '/',
    primaryMeta: 'works today',
    status: 'A Linux AppImage is in the build pipeline; use the web client for now.',
  },
  {
    os: 'android',
    label: 'Android',
    badge: 'AND',
    primaryLabel: 'Download APK',
    primaryHref: '/downloads/CrypticRealm.apk',
    primaryMeta: 'Direct install · 2.9 MB',
    secondaryLabel: 'Use Mobile Web',
    secondaryHref: '/',
    secondaryMeta: 'works today',
    status:
      'Install the APK directly: tap Download, then open the file (allow installs from this source if Android asks). Google Play release is in review.',
  },
  {
    os: 'ios',
    label: 'iOS / iPadOS',
    badge: 'IOS',
    primaryLabel: 'Use Mobile Web',
    primaryHref: '/',
    primaryMeta: 'Safari / PWA',
    status: 'An App Store build is in progress; add the web app to your Home Screen for now.',
  },
];

function action(label: string, href: string, meta: string, extraClass = ''): string {
  // Empty href => a disabled "coming soon" button (e.g. the Heavy tier).
  if (!href) {
    return `
    <span class="cr-dl-btn cr-dl-disabled" aria-disabled="true">
      <span>${label}</span><small>${meta}</small>
    </span>`;
  }
  const external = href.startsWith('http');
  // Direct binary downloads (.exe/.apk) get the download attribute so the
  // browser saves rather than navigates.
  const isDownload = /\.(exe|apk|dmg|appimage|zip)$/i.test(href);
  return `
    <a class="cr-dl-btn${extraClass}" href="${href}" target="${external ? '_blank' : '_self'}" rel="${external ? 'noopener noreferrer' : ''}"${isDownload ? ' download' : ''}>
      <span>${label}</span><small>${meta}</small>
    </a>`;
}

function card(l: Launcher): string {
  let buttons: string;
  if (l.actions && l.actions.length) {
    buttons = l.actions
      .map((a) => action(a.label, a.href, a.meta, a.track ? ' cr-dl-track' : ''))
      .join('');
  } else {
    const primary =
      l.primaryLabel && l.primaryHref && l.primaryMeta
        ? action(l.primaryLabel, l.primaryHref, l.primaryMeta)
        : '';
    const secondary =
      l.secondaryLabel && l.secondaryHref && l.secondaryMeta
        ? action(l.secondaryLabel, l.secondaryHref, l.secondaryMeta, ' cr-dl-track')
        : '';
    buttons = `${primary}${secondary}`;
  }
  return `
    <div class="cr-dl-card" data-launcher="${l.os}">
      <div class="cr-dl-header"><span class="cr-dl-icon">${l.badge}</span><strong>${l.label}</strong></div>
      <div class="cr-dl-row">${buttons}</div>
      <div class="cr-dl-pending">${l.status}</div>
    </div>`;
}

function render(host: HTMLElement): void {
  host.innerHTML = `
    <div class="cr-dl-grid">
      ${LAUNCHERS.map(card).join('')}
    </div>
    <div class="cr-dl-stores">
      <h3>Store listings</h3>
      <div class="cr-dl-stores-row">${STORE_LISTINGS.map(storeCardHtml).join('')}</div>
    </div>
    <p class="cr-dl-foot">
      The browser client is live and remains the source of truth while native installers are built, signed, and tested. Windows Alpha builds are unsigned for now, so your system may warn before install.
    </p>`;
}

export function mountDownloadLaunchers(): void {
  if (typeof document === 'undefined') return;
  let obs: MutationObserver | null = null;

  const arm = () => {
    const target =
      document.getElementById('download-view') ||
      document.querySelector('[data-view="download"]') ||
      document.querySelector('.download-section');
    if (!target) return;
    let host = document.getElementById(HOST_ID) as HTMLElement | null;
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      target.appendChild(host);
    }
    if (host.dataset.crRendered !== '1') {
      render(host);
      host.dataset.crRendered = '1';
    }
    obs?.disconnect();
    obs = null;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
  if (!document.getElementById(HOST_ID) && document.body) {
    obs = new MutationObserver(() => arm());
    obs.observe(document.body, { childList: true, subtree: true });
  }
}
