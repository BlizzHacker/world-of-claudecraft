// Wiki, Links, White Paper, and Contributions are real documents now (the SPA
// no longer hosts an in-page view for them), so they are deliberately absent
// from both routing tables: a link to one of them navigates normally.
const DOC_ROUTE_BY_PATH: Record<string, string> = {
  '/': 'play',
  '/index.html': 'play',
};

const DOC_ROUTE_BY_HASH = new Set([
  'play',
  'game',
  'highscores',
  'leaderboard',
  'news',
  'updates',
  'download',
  'downloads',
  'install',
  'login',
  'register',
  'account',
]);

const loadedFragments = new Set<string>();

export interface DocFragmentOptions {
  errorHtml?: string;
  afterInject?: () => void;
}

export function spaRouteForHref(href: string): string | null {
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    const hashRoute = u.hash.replace(/^#/, '').toLowerCase();
    if (DOC_ROUTE_BY_HASH.has(hashRoute)) return hashRoute;
    return DOC_ROUTE_BY_PATH[u.pathname.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

export function normalizeSpaDocLinks(root: ParentNode): void {
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const route = spaRouteForHref(a.getAttribute('href') ?? '');
    if (!route) return;
    a.href = `/#${route}`;
    a.dataset.crSpaRoute = route;
    a.removeAttribute('target');
    a.removeAttribute('rel');
  });
}

export function extractDocFragment(raw: string): string {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const content = doc.querySelector('main') ?? doc.querySelector('.wrap') ?? doc.body;
  content
    .querySelectorAll('script, style, link, nav, header.hero .hero-logo')
    .forEach((el) => el.remove());
  normalizeSpaDocLinks(content);
  return content.innerHTML;
}

function wireSpaDocClicks(host: Element): void {
  const el = host as HTMLElement;
  if (el.dataset.crSpaDocClicks === '1') return;
  el.dataset.crSpaDocClicks = '1';
  el.addEventListener('click', (event) => {
    const target =
      event.target instanceof Element ? event.target.closest('a[data-cr-spa-route]') : null;
    if (!(target instanceof HTMLAnchorElement)) return;
    const route = target.dataset.crSpaRoute;
    if (!route) return;
    event.preventDefault();
    if (window.location.hash.replace(/^#/, '') === route) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = route;
    }
  });
}

export async function loadDocFragment(
  url: string,
  targetSel: string,
  opts: DocFragmentOptions = {},
): Promise<void> {
  const host = document.querySelector(targetSel);
  const loadedKey = `${targetSel}\n${url}`;
  if (!host || loadedFragments.has(loadedKey)) return;
  wireSpaDocClicks(host);
  try {
    const res = await fetch(url, { headers: { Accept: 'text/html' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    host.innerHTML = extractDocFragment(await res.text());
    loadedFragments.add(loadedKey);
    opts.afterInject?.();
  } catch (err) {
    host.innerHTML =
      opts.errorHtml ?? '<p class="cr-doc-lead">Could not load this page. Try again soon.</p>';
    console.warn('doc fragment load failed:', url, err);
  }
}
