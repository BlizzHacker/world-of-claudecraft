// Download surface for launcher status. The shipped client is the web client;
// desktop/mobile installers link to the release pipeline until signed binaries
// exist, so the UI does not promise unavailable downloads.

const HOST_ID = 'cr-download-launchers';
const RELEASES_URL = 'https://github.com/BlizzHacker/cryptic-realm/releases';

interface Launcher {
  os: 'web' | 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'steam';
  label: string;
  badge: string;
  primaryLabel: string;
  primaryHref: string;
  primaryMeta: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryMeta?: string;
  status: string;
}

const LAUNCHERS: Launcher[] = [
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
    primaryLabel: 'Track Steam',
    primaryHref: RELEASES_URL,
    primaryMeta: 'Windows / macOS / Linux',
    secondaryLabel: 'Play Web',
    secondaryHref: '/',
    secondaryMeta: 'works today',
    status: 'Steam build packaging is tracked here until the store page is approved.',
  },
  {
    os: 'windows',
    label: 'Windows 10/11',
    badge: 'WIN',
    primaryLabel: 'Track Release',
    primaryHref: RELEASES_URL,
    primaryMeta: 'installer pipeline',
    secondaryLabel: 'Play Web',
    secondaryHref: '/',
    secondaryMeta: 'works today',
    status: 'Installer signing/build pipeline is not published yet.',
  },
  {
    os: 'macos',
    label: 'macOS 12+',
    badge: 'MAC',
    primaryLabel: 'Track Release',
    primaryHref: RELEASES_URL,
    primaryMeta: 'dmg pipeline',
    secondaryLabel: 'Play Web',
    secondaryHref: '/',
    secondaryMeta: 'works today',
    status: 'Signed DMG is not published yet.',
  },
  {
    os: 'linux',
    label: 'Linux x86_64',
    badge: 'LIN',
    primaryLabel: 'Track Release',
    primaryHref: RELEASES_URL,
    primaryMeta: 'AppImage pipeline',
    secondaryLabel: 'Play Web',
    secondaryHref: '/',
    secondaryMeta: 'works today',
    status: 'AppImage is not published yet.',
  },
  {
    os: 'android',
    label: 'Android',
    badge: 'AND',
    primaryLabel: 'Download APK',
    primaryHref: '/CrypticRealm.apk',
    primaryMeta: 'Direct install · 2.9 MB',
    secondaryLabel: 'Use Mobile Web',
    secondaryHref: '/',
    secondaryMeta: 'works today',
    status: 'Install the APK directly: tap Download, then open the file (allow installs from this source if Android asks). Google Play release is in review.',
  },
  {
    os: 'ios',
    label: 'iOS / iPadOS',
    badge: 'IOS',
    primaryLabel: 'Track App Store',
    primaryHref: RELEASES_URL,
    primaryMeta: 'iOS build',
    secondaryLabel: 'Use Mobile Web',
    secondaryHref: '/',
    secondaryMeta: 'Safari / PWA',
    status: 'App Store release artifacts are not published yet.',
  },
];

function action(label: string, href: string, meta: string, extraClass = ''): string {
  return `
    <a class="cr-dl-btn${extraClass}" href="${href}" target="${href.startsWith('http') ? '_blank' : '_self'}" rel="${href.startsWith('http') ? 'noopener noreferrer' : ''}">
      <span>${label}</span><small>${meta}</small>
    </a>`;
}

function card(l: Launcher): string {
  const secondary = l.secondaryLabel && l.secondaryHref && l.secondaryMeta
    ? action(l.secondaryLabel, l.secondaryHref, l.secondaryMeta, ' cr-dl-track')
    : '';
  return `
    <div class="cr-dl-card" data-launcher="${l.os}">
      <div class="cr-dl-header"><span class="cr-dl-icon">${l.badge}</span><strong>${l.label}</strong></div>
      <div class="cr-dl-row">${action(l.primaryLabel, l.primaryHref, l.primaryMeta)}${secondary}</div>
      <div class="cr-dl-pending">${l.status}</div>
    </div>`;
}

function render(host: HTMLElement): void {
  host.innerHTML = `
    <div class="cr-dl-grid">
      ${LAUNCHERS.map(card).join('')}
    </div>
    <p class="cr-dl-foot">
      Desktop launcher work is tracked through GitHub releases. The browser client is live and remains the source of truth while installers are built, signed, and tested.
    </p>`;
}

export function mountDownloadLaunchers(): void {
  if (typeof document === 'undefined') return;
  let obs: MutationObserver | null = null;

  const arm = () => {
    const target = document.getElementById('download-view') ||
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
