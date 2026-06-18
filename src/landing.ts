import { mountRealmBranding } from './ui/cryptic/branding';
import { mountThemeSelect } from './ui/cryptic/theme_select';
import { mountNewsRealmFilter } from './ui/cryptic/news_realm_filter';

let appPromise: Promise<typeof import('./main')> | null = null;
let caCopyResetTimer: number | null = null;

function loadApp(): Promise<typeof import('./main')> {
  appPromise ??= import('./main');
  return appPromise;
}

function bootLandingBranding(): void {
  mountRealmBranding();
  mountThemeSelect();
  mountNewsRealmFilter();
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
const VIEWS = ['#hero-view', '#highscores-view', '#wiki-view', '#news-view', '#download-view'];
const NAV_BY_VIEW: Record<string, string> = {
  '#hero-view': 'nav-btn-play',
  '#highscores-view': 'nav-btn-highscores',
  '#wiki-view': 'nav-btn-wiki',
  '#news-view': 'nav-btn-news',
  '#download-view': 'nav-btn-download',
};

interface LandingLeaderboardEntry {
  rank: number;
  name: string;
  cls: string;
  level: number;
  virtualLevel: number;
  lifetimeXp: number;
  prestigeRank?: number;
  realm?: string;
}

interface LandingReleaseEntry {
  tag?: string;
  name?: string;
  body?: string;
  url?: string;
  prerelease?: boolean;
  publishedAt?: string;
}

let highscoresLoading = false;
let newsLoading = false;
let downloadMounted = false;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function closeMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('.homepage-header');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  header?.classList.remove('menu-open');
  toggleBtn?.setAttribute('aria-expanded', 'false');
}

function switchLandingView(targetId: string): void {
  closeMobileMenu();

  for (const id of VIEWS) {
    const el = document.querySelector<HTMLElement>(id);
    if (!el) continue;
    const isTarget = id === targetId;
    el.toggleAttribute('hidden', !isTarget);
    el.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
  }

  const activeNavId = NAV_BY_VIEW[targetId];
  document.querySelectorAll<HTMLElement>('.nav-link').forEach((link) => {
    const isActive = link.id === activeNavId;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    link.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  const onPlayPage = targetId === '#hero-view';
  document.getElementById('start-screen-backdrop')?.classList.toggle('trailer-off', !onPlayPage);
  const trailer = document.getElementById('bg-trailer') as HTMLVideoElement | null;
  if (trailer && !onPlayPage) trailer.pause();
}

function renderHighscores(rows: LandingLeaderboardEntry[]): string {
  if (rows.length === 0) return '<div class="hs-empty">No rankings yet.</div>';
  const numberFormat = new Intl.NumberFormat();
  const head = '<div class="hs-row hs-head">'
    + '<span class="hs-rank">Rank</span>'
    + '<span class="hs-name">Name</span>'
    + '<span class="hs-realm">Realm</span>'
    + '<span class="hs-lvl">Level</span>'
    + '<span class="hs-vlvl">Virtual</span>'
    + '<span class="hs-xp">Lifetime XP</span></div>';
  const body = rows.map((r) => {
    const prestige = (r.prestigeRank ?? 0) > 0 ? `<span class="hs-prestige">*${r.prestigeRank}</span>` : '';
    return `<div class="hs-row${r.rank <= 3 ? ' hs-top' : ''}">`
      + `<span class="hs-rank">${r.rank}</span>`
      + `<span class="hs-name">${prestige}${escapeHtml(r.name)}</span>`
      + `<span class="hs-realm">${escapeHtml(r.realm ?? '')}</span>`
      + `<span class="hs-lvl">${r.level}</span>`
      + `<span class="hs-vlvl">${r.virtualLevel}</span>`
      + `<span class="hs-xp">${numberFormat.format(r.lifetimeXp)}</span></div>`;
  }).join('');
  return head + body;
}

async function loadLandingHighscores(): Promise<void> {
  const host = document.getElementById('hs-leaderboard');
  if (!host || highscoresLoading) return;
  highscoresLoading = true;
  host.innerHTML = '<div class="hs-loading">Loading rankings...</div>';
  try {
    const res = await fetch('/api/leaderboard?scope=global&metric=lifetimeXp&limit=100');
    if (!res.ok) throw new Error(`request failed (${res.status})`);
    const data = await res.json();
    host.innerHTML = renderHighscores(Array.isArray(data.leaders) ? data.leaders : []);
  } catch {
    host.innerHTML = '<div class="hs-error">Could not load rankings. Try again soon.</div>';
  } finally {
    highscoresLoading = false;
  }
}

function renderReleaseBody(body: string): string {
  const inline = (line: string): string =>
    escapeHtml(line)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 8)
    .map((line) => `<p>${inline(line.replace(/^#{1,6}\s+/, '').replace(/^\s*[-*]\s+/, ''))}</p>`)
    .join('');
}

async function loadLandingNews(): Promise<void> {
  const host = document.getElementById('news-feed');
  if (!host || newsLoading) return;
  newsLoading = true;
  host.innerHTML = '<div class="news-loading">Loading the latest updates...</div>';
  const pinned = [
    {
      title: '$CR + Platinum Utility',
      body: '$CR is the Cryptic Realm Solana SPL token. Platinum is the in-game premium bridge for cosmetics, houses, mounts, marketplace listings, and Exchange realm trades. The base game stays free to play.',
      tag: '$CR',
      url: '/links.html',
      realm: 'all',
    },
    {
      title: 'Alpha, Beta, And Public Realm Cadence',
      body: 'Alpha testers can earn platinum at a higher rate because alpha characters reset every two weeks. Beta promotion happens monthly into public Cryptic Realm and MoveWeight realms after review.',
      tag: 'Official Work Log',
      url: '/whitepaper.html',
      realm: 'all',
    },
    {
      title: 'Upstream Kindness Track',
      body: 'Generic engine, auth, dashboard, auto-update, moderator, and wiki improvements are tracked as shareable work for the ClaudeCraft team while Cryptic Realm-specific realms and $CR features stay here.',
      tag: 'ClaudeCraft PRs',
      url: 'https://github.com/BlizzHacker/cryptic-realm/pulls',
      realm: 'claudecraft',
    },
    {
      title: '$CR Proof',
      body: 'Mint 3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv is published on the public proof page with treasury and Solscan links.',
      tag: 'Solana',
      url: 'https://solscan.io/token/3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv',
      realm: 'all',
    },
  ];
  const pinnedHtml = pinned.map((r) => {
    const external = /^https?:\/\//.test(r.url);
    return `<article class="news-item cr-news-pinned" data-news-item data-realm="${escapeHtml(r.realm)}">`
      + `<div class="news-item-head"><h3 class="news-item-title">${escapeHtml(r.title)}</h3><span class="news-tag">${escapeHtml(r.tag)}</span></div>`
      + `<div class="news-body"><p>${escapeHtml(r.body)}</p></div>`
      + `<div class="news-item-foot"><a class="news-link" href="${escapeHtml(r.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>Open</a></div>`
      + `</article>`;
  }).join('');
  try {
    const res = await fetch('/api/releases?limit=20');
    if (!res.ok) throw new Error(`request failed (${res.status})`);
    const data = await res.json();
    const releases: LandingReleaseEntry[] = Array.isArray(data.releases) ? data.releases : [];
    if (releases.length === 0) {
      host.innerHTML = `${pinnedHtml}<div class="news-empty">No release notes yet.</div>`;
      return;
    }
    const releaseHtml = releases.map((r) => {
      const title = escapeHtml(r.name || r.tag || 'Update');
      const tag = r.tag ? `<span class="news-tag">${escapeHtml(r.tag)}</span>` : '';
      const badge = r.prerelease ? '<span class="news-badge">Prerelease</span>' : '';
      const when = r.publishedAt
        ? `<span class="news-date">${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(r.publishedAt))}</span>`
        : '';
      const link = r.url
        ? `<div class="news-item-foot"><a class="news-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">View on GitHub</a></div>`
        : '';
      return `<article class="news-item" data-news-item data-realm="all"><div class="news-item-head"><h3 class="news-item-title">${title}</h3>${tag}${badge}${when}</div>`
        + `<div class="news-body">${renderReleaseBody(r.body ?? '')}</div>${link}</article>`;
    }).join('');
    host.innerHTML = `${pinnedHtml}${releaseHtml}`;
  } catch {
    host.innerHTML = `${pinnedHtml}<div class="news-error">Could not load release notes. Try again soon.</div>`;
  } finally {
    newsLoading = false;
  }
}

async function mountLandingDownloads(): Promise<void> {
  if (downloadMounted) return;
  downloadMounted = true;
  const { mountDownloadLaunchers } = await import('./ui/cryptic/download_launchers');
  mountDownloadLaunchers();
}

function showPanel(selector: string): void {
  switchLandingView('#hero-view');
  for (const id of PANELS) {
    const el = document.querySelector<HTMLElement>(id);
    if (!el) continue;
    const isTarget = id === selector;
    el.toggleAttribute('hidden', !isTarget);
    el.setAttribute('aria-hidden', isTarget ? 'false' : 'true');
  }
  document.body.dataset.startPanel = selector.slice(1);
  const logoImg = document.getElementById('title-logo');
  if (logoImg) {
    logoImg.toggleAttribute(
      'hidden',
      selector === '#login-panel' || selector === '#charselect-panel' || selector === '#offline-select',
    );
  }
}

function wireLandingPanels(): void {
  document.getElementById('nav-btn-play')?.addEventListener('click', () => showPanel('#mode-select'));
  document.getElementById('nav-btn-login')?.addEventListener('click', () => showPanel('#login-panel'));
  document.getElementById('nav-btn-highscores')?.addEventListener('click', () => {
    switchLandingView('#highscores-view');
    void loadLandingHighscores();
  });
  document.getElementById('nav-btn-wiki')?.addEventListener('click', () => switchLandingView('#wiki-view'));
  document.getElementById('nav-btn-news')?.addEventListener('click', () => {
    switchLandingView('#news-view');
    void loadLandingNews();
  });
  document.getElementById('nav-btn-download')?.addEventListener('click', () => {
    switchLandingView('#download-view');
    void mountLandingDownloads();
  });
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

function applyHashRoute(): void {
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  if (hash === 'highscores' || hash === 'leaderboard') {
    switchLandingView('#highscores-view');
    void loadLandingHighscores();
    return;
  }
  if (hash === 'wiki') {
    switchLandingView('#wiki-view');
    return;
  }
  if (hash === 'news' || hash === 'updates') {
    switchLandingView('#news-view');
    void loadLandingNews();
    return;
  }
  if (hash === 'download' || hash === 'downloads' || hash === 'install') {
    switchLandingView('#download-view');
    void mountLandingDownloads();
  }
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

// SSO return path: Authentik redirects back to `/#auth_token=...&auth_user=...`.
// The landing shell defers importing ./main until a UI trigger, but the SSO
// pickup lives in main.ts (wireStartScreens), so on this path we must eagerly
// load the app — otherwise the token sits unread in the hash and the user
// stays logged out. main.ts consumes + cleans the hash on boot.
function ssoCallbackPending(): boolean {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return hash.startsWith('#') && hash.includes('auth_token=');
}

// Keep --app-vw / --app-vh in exact pixels on the landing page too. main.ts
// runs the same sync once the game loads, but the landing shell loads first
// and would otherwise leave the CSS fallback in place — on mobile a 100vw
// fallback overflows right (excludes scrollbar / safe-area). Mirror the
// game's behaviour so the landing matches the visual viewport.
function syncLandingViewport(): void {
  const w = Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth));
  const h = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
  document.documentElement.style.setProperty('--app-vw', `${w}px`);
  document.documentElement.style.setProperty('--app-vh', `${h}px`);
}

function boot(): void {
  syncLandingViewport();
  window.addEventListener('resize', syncLandingViewport);
  window.visualViewport?.addEventListener('resize', syncLandingViewport);
  bootLandingBranding();
  wireContractAddressCopy();
  wireLandingPanels();
  wireDeferredAppLoad();
  if (ssoCallbackPending()) {
    void loadApp();
  }
  applyHashRoute();
  window.addEventListener('hashchange', applyHashRoute);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
