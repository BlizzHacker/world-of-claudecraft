import { crypticMusic } from './game/cryptic_music';
import { mountRealmBranding } from './ui/cryptic/branding';
import { mountMusicWidget } from './ui/cryptic/music_widget';
import { installNativeSsoReturnHandler, wireNativeSsoLink } from './ui/cryptic/native_sso';
import { mountNewsRealmFilter } from './ui/cryptic/news_realm_filter';
import { readCrypticSession } from './ui/cryptic/session';
import { mountThemeSelect } from './ui/cryptic/theme_select';
import { mountUserDropdown } from './ui/cryptic/user_dropdown';
import { mountWalletPanel } from './ui/cryptic/wallet_panel';

let appPromise: Promise<typeof import('./main')> | null = null;
let caCopyResetTimer: number | null = null;

function loadApp(): Promise<typeof import('./main')> {
  appPromise ??= import('./main');
  return appPromise;
}

function landingShellActive(): boolean {
  return document.body.dataset.crFullClient !== '1';
}

// Fill the "… Players Online / … Accounts Created" placeholders on the landing
// page. main.ts does this once the game loads, but the landing shell loads
// first and would otherwise leave the "…" placeholders. Lightweight fetch.
async function loadLandingStats(): Promise<void> {
  const playerEls = document.querySelectorAll<HTMLElement>('.js-stat-players');
  const accountEls = document.querySelectorAll<HTMLElement>('.js-stat-accounts');
  if (!playerEls.length && !accountEls.length) return;
  try {
    const res = await fetch('/api/project-stats', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return;
    const data = await res.json();
    playerEls.forEach((el) => {
      el.textContent = String(data.players_online ?? 0);
    });
    accountEls.forEach((el) => {
      el.textContent = String(data.accounts_created ?? 0);
    });
  } catch {
    /* leave placeholders on failure */
  }
}

function bootLandingBranding(): void {
  mountRealmBranding();
  mountThemeSelect();
  mountNewsRealmFilter();
  void mountUserDropdown();
  void loadLandingStats();
  // Monster Chronicle / Skill Trees / Loot Vault / Pickit are in-game reference
  // tools — they belong in the game, not cluttering the realm selector. Mounted
  // from main.ts startGame() instead of here (the #cr-bestiary-host div was also
  // removed from #realm-panel in index.html).
  mountWalletPanel();
  wireNativeSsoLink();
}

function acceptNativeSsoHash(hash: string): void {
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search + hash);
  } catch {
    window.location.hash = hash;
  }
  window.dispatchEvent(new CustomEvent('cr:sso-native-return', { detail: { hash } }));
  void loadApp().catch((err) => {
    console.error('[cr-boot] loadApp failed after native SSO return', err);
  });
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
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  };

  btn.addEventListener('click', () => {
    const ca = btn.getAttribute('data-ca');
    if (!ca) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(ca)
        .then(showCopied)
        .catch(() => {
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
  '.auth-tab',
].join(',');

const PANELS = [
  '#mode-select',
  '#login-panel',
  '#realm-panel',
  '#charselect-panel',
  '#offline-select',
];
// Only views that actually exist as sections in index.html. Wiki, Contributions,
// Links, and White Paper are real documents (/wiki, /contributions.html,
// /links.html, /whitepaper.html); their nav buttons NAVIGATE instead of
// switching an in-page view (a switch to a missing section blanked the page).
const VIEWS = ['#hero-view', '#highscores-view', '#news-view', '#download-view'];
const NAV_BY_VIEW: Record<string, string> = {
  '#hero-view': 'nav-btn-play',
  '#highscores-view': 'nav-btn-highscores',
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
  return value.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );
}

function closeMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('.homepage-header');
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  header?.classList.remove('menu-open');
  toggleBtn?.setAttribute('aria-expanded', 'false');
}

function blurFocusedDescendant(el: HTMLElement): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && el.contains(active)) active.blur();
}

function setPanelVisibility(el: HTMLElement, visible: boolean): void {
  if (!visible) blurFocusedDescendant(el);
  el.toggleAttribute('hidden', !visible);
  el.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function wireMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('.homepage-header');
  const toggleBtn = document.getElementById('mobile-menu-toggle') as HTMLButtonElement | null;
  if (!header || !toggleBtn || toggleBtn.dataset.crMobileMenuMounted === '1') return;
  toggleBtn.dataset.crMobileMenuMounted = '1';
  toggleBtn.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function switchLandingView(targetId: string): void {
  if (!landingShellActive()) return;
  closeMobileMenu();

  for (const id of VIEWS) {
    const el = document.querySelector<HTMLElement>(id);
    if (!el) continue;
    const isTarget = id === targetId;
    setPanelVisibility(el, isTarget);
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
  const head =
    '<div class="hs-row hs-head">' +
    '<span class="hs-rank">Rank</span>' +
    '<span class="hs-name">Name</span>' +
    '<span class="hs-realm">Realm</span>' +
    '<span class="hs-lvl">Level</span>' +
    '<span class="hs-vlvl">Virtual</span>' +
    '<span class="hs-xp">Lifetime XP</span></div>';
  const body = rows
    .map((r) => {
      const prestige =
        (r.prestigeRank ?? 0) > 0 ? `<span class="hs-prestige">*${r.prestigeRank}</span>` : '';
      return (
        `<div class="hs-row${r.rank <= 3 ? ' hs-top' : ''}">` +
        `<span class="hs-rank">${r.rank}</span>` +
        `<span class="hs-name">${prestige}${escapeHtml(r.name)}</span>` +
        `<span class="hs-realm">${escapeHtml(r.realm ?? '')}</span>` +
        `<span class="hs-lvl">${r.level}</span>` +
        `<span class="hs-vlvl">${r.virtualLevel}</span>` +
        `<span class="hs-xp">${numberFormat.format(r.lifetimeXp)}</span></div>`
      );
    })
    .join('');
  return head + body;
}

let highscoresScope: 'global' | 'ladder' = 'global';
async function loadLandingHighscores(scope: 'global' | 'ladder' = highscoresScope): Promise<void> {
  const host = document.getElementById('hs-leaderboard');
  if (!host || highscoresLoading) return;
  highscoresScope = scope;
  highscoresLoading = true;
  host.innerHTML = '<div class="hs-loading">Loading rankings...</div>';
  try {
    const res = await fetch(`/api/leaderboard?scope=${scope}&metric=lifetimeXp&limit=100`);
    if (!res.ok) throw new Error(`request failed (${res.status})`);
    const data = await res.json();
    const leaders = Array.isArray(data.leaders) ? data.leaders : [];
    if (!leaders.length && scope === 'ladder') {
      host.innerHTML =
        '<div class="hs-empty">No ladder champions yet — be the first to climb a ladder realm.</div>';
    } else {
      host.innerHTML = renderHighscores(leaders);
    }
  } catch {
    host.innerHTML = '<div class="hs-error">Could not load rankings. Try again soon.</div>';
  } finally {
    highscoresLoading = false;
  }
}

function wireHighscoresScope(): void {
  document.querySelectorAll<HTMLElement>('.hs-scope-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scope = btn.dataset.hsScope === 'ladder' ? 'ladder' : 'global';
      if (scope === highscoresScope) return;
      document.querySelectorAll<HTMLElement>('.hs-scope-btn').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      void loadLandingHighscores(scope);
    });
  });
}

function renderReleaseBody(body: string): string {
  const inline = (line: string): string =>
    escapeHtml(line)
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`,
      )
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
      url: '/#links',
      realm: 'all',
    },
    {
      title: 'Alpha, Beta, And Public Realm Cadence',
      body: 'Alpha testers can earn platinum at a higher rate because alpha characters reset every two weeks. Beta promotion happens monthly into public Cryptic Realm and MoveWeight realms after review.',
      tag: 'Official Work Log',
      url: '/#whitepaper',
      realm: 'all',
    },
    {
      title: 'ClaudeCraft / ClaudeCode Contributions',
      body: 'Shared engine, auth, dashboard, auto-update, moderator, wiki, and launcher improvements are tracked separately from Cryptic Realm-only realms, $CR, platinum, and custom content.',
      tag: 'ClaudeCraft PRs',
      url: '/#contributions',
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
  const pinnedHtml = pinned
    .map((r) => {
      const external = /^https?:\/\//.test(r.url);
      return (
        `<article class="news-item cr-news-pinned" data-news-item data-realm="${escapeHtml(r.realm)}">` +
        `<div class="news-item-head"><h3 class="news-item-title">${escapeHtml(r.title)}</h3><span class="news-tag">${escapeHtml(r.tag)}</span></div>` +
        `<div class="news-body"><p>${escapeHtml(r.body)}</p></div>` +
        `<div class="news-item-foot"><a class="news-link" href="${escapeHtml(r.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>Open</a></div>` +
        `</article>`
      );
    })
    .join('');
  try {
    const res = await fetch('/api/releases?limit=20');
    if (!res.ok) throw new Error(`request failed (${res.status})`);
    const data = await res.json();
    const releases: LandingReleaseEntry[] = Array.isArray(data.releases) ? data.releases : [];
    if (releases.length === 0) {
      host.innerHTML = `${pinnedHtml}<div class="news-empty">No release notes yet.</div>`;
      return;
    }
    const releaseHtml = releases
      .map((r) => {
        const title = escapeHtml(r.name || r.tag || 'Update');
        const tag = r.tag ? `<span class="news-tag">${escapeHtml(r.tag)}</span>` : '';
        const badge = r.prerelease ? '<span class="news-badge">Prerelease</span>' : '';
        const when = r.publishedAt
          ? `<span class="news-date">${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(r.publishedAt))}</span>`
          : '';
        const link = r.url
          ? `<div class="news-item-foot"><a class="news-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">Read release notes</a></div>`
          : '';
        return (
          `<article class="news-item" data-news-item data-realm="all"><div class="news-item-head"><h3 class="news-item-title">${title}</h3>${tag}${badge}${when}</div>` +
          `<div class="news-body">${renderReleaseBody(r.body ?? '')}</div>${link}</article>`
        );
      })
      .join('');
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
  if (!landingShellActive()) return;
  switchLandingView('#hero-view');
  for (const id of PANELS) {
    const el = document.querySelector<HTMLElement>(id);
    if (!el) continue;
    const isTarget = id === selector;
    setPanelVisibility(el, isTarget);
  }
  document.body.dataset.startPanel = selector.slice(1);
  const logoImg = document.getElementById('title-logo');
  if (logoImg) {
    logoImg.toggleAttribute(
      'hidden',
      selector === '#login-panel' ||
        selector === '#realm-panel' ||
        selector === '#charselect-panel' ||
        selector === '#offline-select',
    );
  }
  const panel = document.querySelector<HTMLElement>(selector);
  if (panel) {
    window.requestAnimationFrame(() => {
      if (!panel.hasAttribute('hidden'))
        panel.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
  }
}

async function launchClassic(): Promise<void> {
  const host = document.getElementById('classic-root');
  if (!host) return;
  try {
    const mod = await import('./classic/classic-entry');
    document
      .querySelectorAll<HTMLElement>(
        '#mode-select,#login-panel,#realm-panel,#charselect-panel,#offline-select',
      )
      .forEach((el) => {
        el.style.display = 'none';
      });
    mod.mountClassic(host, {
      onExit: () => {
        const ms = document.getElementById('mode-select');
        if (ms) ms.style.display = '';
      },
    });
  } catch (err) {
    console.error('[classic] failed to launch', err);
    host.style.display = 'none';
  }
}

// Lightweight realm-list loader for the HOME PAGE (landing.ts entry). The full
// picker lives in main.ts but only loads after login; this lets logged-out
// visitors browse the available realms/servers immediately. Clicking a realm
// routes to login (the connect itself needs a session).
let landingRealmsLoaded = false;
async function loadLandingRealms(): Promise<void> {
  const listEl = document.getElementById('realm-list');
  if (!listEl) return;
  if (landingRealmsLoaded && listEl.querySelector('.realm-row')) return;
  try {
    const res = await fetch('/api/realms');
    if (!res.ok) throw new Error(`realms ${res.status}`);
    const dir = (await res.json()) as { realms?: { name: string; url: string; type: string }[] };
    const realms = Array.isArray(dir.realms) ? dir.realms : [];
    if (!realms.length) {
      listEl.innerHTML = '<div class="realm-loading">No realms available right now.</div>';
      return;
    }

    // Group by base realm so each realm is ONE row with its stages (Live default
    // + Alpha/Beta/Dev pills) instead of 4 flat rows each. Keeps the list compact
    // and shows every server, not just the live ones.
    interface Stage {
      stage: string;
      url: string;
    }
    interface Group {
      base: string;
      type: string;
      stages: Stage[];
    }
    const groups = new Map<string, Group>();
    const order: string[] = [];
    for (const r of realms) {
      const m = /^(.*?)\s*\[(BETA|ALPHA|DEV)\]\s*$/i.exec(r.name);
      const base = (m ? m[1] : r.name).trim();
      const stage = m ? m[2].toUpperCase() : 'LIVE';
      if (!groups.has(base)) {
        groups.set(base, { base, type: r.type, stages: [] });
        order.push(base);
      }
      const g = groups.get(base)!;
      if (stage === 'LIVE') g.type = r.type; // live row defines the realm type
      g.stages.push({ stage, url: r.url });
    }
    const STAGE_ORDER = ['LIVE', 'BETA', 'ALPHA', 'DEV'];
    const sortStages = (s: Stage[]) =>
      s.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

    listEl.innerHTML = order
      .map((base) => {
        const g = groups.get(base)!;
        sortStages(g.stages);
        const live = g.stages.find((s) => s.stage === 'LIVE') ?? g.stages[0];
        const extra = g.stages.filter((s) => s.stage !== 'LIVE');
        const pills = extra
          .map(
            (s) =>
              `<button type="button" class="realm-stage-pill realm-stage-${s.stage.toLowerCase()}" data-url="${escapeHtml(s.url)}" data-name="${escapeHtml(base + ' [' + s.stage + ']')}">${s.stage}</button>`,
          )
          .join('');
        return `
      <div class="realm-row" data-name="${escapeHtml(base)}" data-url="${escapeHtml(live.url)}">
        <div class="realm-row-main">
          <div class="realm-name">${escapeHtml(base)}</div>
          <div class="realm-sub">${escapeHtml(g.type)} realm${extra.length ? ' · ' + extra.length + ' test ' + (extra.length === 1 ? 'stage' : 'stages') : ''}</div>
        </div>
        <div class="realm-meta">
          <div class="realm-type">${escapeHtml(g.type)}</div>
          ${pills ? `<div class="realm-stages">${pills}</div>` : ''}
        </div>
      </div>`;
      })
      .join('');

    const connect = (url: string | undefined) => {
      if (readCrypticSession()) {
        document.body.dataset.pendingOnlineResume = '1';
        showPanel('#realm-panel');
        void loadApp();
      } else if (url) {
        try {
          localStorage.setItem('cr_pending_realm_url', url);
        } catch {
          /* ignore */
        }
        showPanel('#login-panel');
      }
    };
    // Stage pills route to their stage URL without triggering the row's live click.
    listEl.querySelectorAll<HTMLElement>('.realm-stage-pill').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        connect(pill.dataset.url);
      });
    });
    listEl.querySelectorAll<HTMLElement>('.realm-row').forEach((row) => {
      row.addEventListener('click', () => connect(row.dataset.url));
    });
    landingRealmsLoaded = true;
  } catch {
    listEl.innerHTML =
      '<div class="realm-loading">Could not load realms — try again shortly.</div>';
  }
}

function wireLandingPanels(): void {
  document
    .getElementById('nav-btn-play')
    ?.addEventListener('click', () => showPanel('#mode-select'));
  document
    .getElementById('nav-btn-login')
    ?.addEventListener('click', () => showPanel('#login-panel'));
  document.getElementById('nav-btn-highscores')?.addEventListener('click', () => {
    switchLandingView('#highscores-view');
    void loadLandingHighscores();
  });
  document.getElementById('nav-btn-wiki')?.addEventListener('click', () => {
    window.location.href = '/wiki';
  });
  document.getElementById('nav-btn-news')?.addEventListener('click', () => {
    switchLandingView('#news-view');
    void loadLandingNews();
  });
  document.getElementById('nav-btn-contributions')?.addEventListener('click', () => {
    window.location.href = '/contributions.html';
  });
  document.getElementById('nav-btn-download')?.addEventListener('click', () => {
    switchLandingView('#download-view');
    void mountLandingDownloads();
  });
  document.getElementById('nav-btn-links')?.addEventListener('click', () => {
    window.location.href = '/links.html';
  });
  document.getElementById('nav-btn-whitepaper')?.addEventListener('click', () => {
    window.location.href = '/whitepaper.html';
  });
  document.getElementById('btn-classic-mode')?.addEventListener('click', () => {
    void launchClassic();
  });
  document.getElementById('btn-play')?.addEventListener('click', () => {
    const mode = document.getElementById('server-select')?.dataset.mode ?? 'online';
    if (mode === 'offline') {
      showPanel('#offline-select');
      selectLandingOfflineClass('warrior');
      return;
    }
    // Online: show the realm list to EVERYONE (logged in or not) so players can
    // browse/choose a server before committing. loadApp() drives the full picker
    // when logged in; otherwise we render the browsable list and gate the actual
    // connect on login.
    if (readCrypticSession()) {
      document.body.dataset.pendingOnlineResume = '1';
      showPanel('#realm-panel');
      void loadApp();
      return;
    }
    showPanel('#realm-panel');
    void loadLandingRealms();
  });

  const trigger = document.getElementById('server-select-trigger');
  const menu = document.getElementById('server-select-menu');
  const playLabel = document.querySelector<HTMLElement>('#btn-play .btn-play-label');
  if (playLabel) playLabel.textContent = readCrypticSession() ? 'Continue' : 'Log In To Play';

  // Hide Login / Register entries once the player has a session (SSO or local).
  // A logged-in user has no use for them and they clutter the nav. Re-evaluated
  // on focus so it reflects a login/logout that happened in another tab.
  const syncAuthVisibility = () => {
    const loggedIn = !!readCrypticSession();
    for (const sel of ['#btn-login', '#btn-register', '#nav-btn-login']) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) el.style.display = loggedIn ? 'none' : '';
    }
  };
  syncAuthVisibility();
  window.addEventListener('focus', syncAuthVisibility);
  window.addEventListener('cr-session-change', syncAuthVisibility);
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
      if (playLabel)
        playLabel.textContent =
          mode === 'offline'
            ? 'Start Offline'
            : readCrypticSession()
              ? 'Continue'
              : 'Log In To Play';
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

function selectLandingOfflineClass(cls: string): void {
  const cards = document.querySelectorAll<HTMLElement>('#offline-select .mini-class');
  let selected: HTMLElement | null = null;
  cards.forEach((card) => {
    const on = card.dataset.class === cls;
    card.classList.toggle('sel', on);
    card.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) selected = card;
  });
  if (!selected && cards[0]) {
    cards[0].classList.add('sel');
    cards[0].setAttribute('aria-pressed', 'true');
  }
  document.getElementById('btn-start-offline')?.removeAttribute('disabled');
}

function wireLandingOfflinePanel(): void {
  document.querySelectorAll<HTMLElement>('#offline-select .mini-class').forEach((card) => {
    card.addEventListener('click', () =>
      selectLandingOfflineClass(card.dataset.class ?? 'warrior'),
    );
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectLandingOfflineClass(card.dataset.class ?? 'warrior');
      }
    });
  });
  document.getElementById('btn-offline-back')?.addEventListener('click', (event) => {
    event.preventDefault();
    showPanel('#mode-select');
  });
  document.getElementById('btn-start-offline')?.addEventListener('click', (event) => {
    if (appPromise) return;
    event.preventDefault();
    event.stopPropagation();
    document.body.dataset.pendingOfflineStart = '1';
    void loadApp();
  });
}

function applyHashRoute(): void {
  if (!landingShellActive()) return;
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  if (hash === 'play' || hash === 'game') {
    showPanel('#mode-select');
    return;
  }
  if (hash === 'highscores' || hash === 'leaderboard') {
    switchLandingView('#highscores-view');
    void loadLandingHighscores();
    return;
  }
  if (hash === 'wiki') {
    window.location.href = '/wiki';
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
    return;
  }
  if (hash === 'contributions') {
    window.location.href = '/contributions.html';
    return;
  }
  if (hash === 'links') {
    window.location.href = '/links.html';
    return;
  }
  if (hash === 'whitepaper') {
    window.location.href = '/whitepaper.html';
    return;
  }
  if (hash === 'login' || hash === 'register' || hash === 'account') {
    showPanel('#login-panel');
  }
}

function wireDeferredAppLoad(): void {
  document.addEventListener(
    'click',
    (event) => {
      if (appPromise) return;
      const target =
        event.target instanceof Element ? targetClosest(event.target, APP_TRIGGER_SELECTOR) : null;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      // If the trigger is a submit button inside a form (login / register), the
      // app wires the form's `submit` event — NOT the button's click. A synthetic
      // click does not trigger native form submission, so re-dispatching a click
      // would silently do nothing (this is what broke login-to-play). Re-submit
      // the form via requestSubmit() so the app's submit handler actually runs.
      const submitBtn =
        target instanceof HTMLButtonElement && target.type === 'submit' ? target : null;
      const form = submitBtn?.form ?? target.closest('form');
      if (target.id === 'btn-online' && readCrypticSession()) {
        document.body.dataset.pendingOnlineResume = '1';
      }
      void loadApp().then(() => {
        window.setTimeout(() => {
          if (form instanceof HTMLFormElement) {
            if (typeof form.requestSubmit === 'function') {
              form.requestSubmit(submitBtn ?? undefined);
            } else {
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          } else {
            target.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
            );
          }
        });
      });
    },
    true,
  );
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

// Surface any error/rejection during the SSO-return boot instead of letting
// the page silently freeze. Shows a dismissible banner with the message so we
// can diagnose; also logs the full error to the console.
function installBootErrorTrap(): void {
  const show = (label: string, detail: string) => {
    try {
      // eslint-disable-next-line no-console
      console.error(`[cr-boot] ${label}:`, detail);
      let bar = document.getElementById('cr-boot-error');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'cr-boot-error';
        bar.style.cssText =
          'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#3a0a0a;color:#ffd7d7;font:12px/1.5 ui-monospace,monospace;padding:8px 12px;border-top:2px solid #ff5a5f;max-height:40vh;overflow:auto;white-space:pre-wrap;';
        document.body.appendChild(bar);
      }
      bar.textContent = `Boot error (${label}): ${detail}\n(tap to dismiss)`;
      bar.onclick = () => bar?.remove();
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('error', (e) =>
    show('error', `${e.message} @ ${e.filename}:${e.lineno}`),
  );
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    show('promise', r instanceof Error ? `${r.message}\n${r.stack ?? ''}` : String(r));
  });
}

function boot(): void {
  installBootErrorTrap();
  syncLandingViewport();
  window.addEventListener('resize', syncLandingViewport);
  window.visualViewport?.addEventListener('resize', syncLandingViewport);
  bootLandingBranding();
  wireMobileMenu();
  wireContractAddressCopy();
  wireLandingPanels();
  wireHighscoresScope();
  wireLandingOfflinePanel();
  wireDeferredAppLoad();
  void installNativeSsoReturnHandler(acceptNativeSsoHash);
  // The home page runs landing.ts (NOT main.ts), so mount the moveable music
  // widget here too. First gesture unlocks autoplay.
  mountMusicWidget();
  const kickMusic = () => {
    crypticMusic.kick();
    window.removeEventListener('pointerdown', kickMusic);
    window.removeEventListener('keydown', kickMusic);
  };
  window.addEventListener('pointerdown', kickMusic);
  window.addEventListener('keydown', kickMusic);
  if (ssoCallbackPending()) {
    void loadApp().catch((err) => {
      console.error('[cr-boot] loadApp failed', err);
    });
  }
  applyHashRoute();
  window.addEventListener('hashchange', applyHashRoute);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
