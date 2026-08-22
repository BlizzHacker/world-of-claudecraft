// Landing-page desktop-download wiring. Builds the per-platform installer URLs
// from one version constant and, as progressive enhancement, highlights the
// visitor's own OS and reveals the AppImage note for Linux. main.ts stays a
// firewall: it only calls initDesktopDownload() once at landing bootstrap. The
// pure helpers (detectDesktopPlatform, desktopDownloadUrl) are Node-tested.

export type DesktopPlatform = 'mac' | 'win' | 'linux' | 'other';

// The published desktop build on the update host. Bump in lockstep with the
// artifacts uploaded to updates.crypticrealm.com/desktop/ at release
// (see docs/desktop-release.md). The static hrefs in index.html carry the same
// version as a no-JS fallback.
export const DESKTOP_VERSION = '0.35.1';
const DESKTOP_HOST = 'https://updates.crypticrealm.com/desktop';

// electron-builder website-channel artifact names (docs/desktop-release.md):
// mac ships one universal dmg; the x64 Linux AppImage is named x86_64 (that is
// electron-builder's arch token for AppImage, not "x64"). Windows ships a
// separate single-arch NSIS installer per arch (build.nsis.buildUniversalInstaller
// is false, issue 2013); this page links the x64 installer, matching every other
// channel's precedent of running Windows-on-ARM visitors under x64 emulation
// rather than shipping a second download button.
const ARTIFACT: Partial<Record<DesktopPlatform, string>> = {
  mac: `cryptic-realm-${DESKTOP_VERSION}-mac-universal.dmg`,
  win: `cryptic-realm-${DESKTOP_VERSION}-win-x64.exe`,
  linux: `cryptic-realm-${DESKTOP_VERSION}-linux-x86_64.AppImage`,
};

// Full download URL for a platform, or null when no artifact is published for it.
export function desktopDownloadUrl(platform: DesktopPlatform): string | null {
  const file = ARTIFACT[platform];
  return file ? `${DESKTOP_HOST}/${file}` : null;
}

// electron-builder always publishes latest.yml beside the website-channel
// artifacts, so a HEAD probe of it is the cheap "are desktop builds actually
// up?" gate: probing every per-platform artifact would cost three requests
// and drift with the artifact names.
export const DESKTOP_LATEST_YML_URL = `${DESKTOP_HOST}/latest.yml`;

/** Pure gate over the HEAD-probe outcome: only a 2xx proves the update host is
 *  publishing builds. null (network failure / CORS) and every non-2xx status
 *  read as absent, so the page never advertises an installer that would 404. */
export function desktopBuildsPublished(status: number | null): boolean {
  return status !== null && status >= 200 && status < 300;
}

type HeadFetcher = (url: string, init: { method: 'HEAD' }) => Promise<{ status: number }>;

/** HEAD-probe latest.yml on the update host; resolves the pure gate's verdict.
 *  Never throws: any transport failure is "not published". */
export async function probeDesktopBuilds(fetcher: HeadFetcher): Promise<boolean> {
  try {
    const res = await fetcher(DESKTOP_LATEST_YML_URL, { method: 'HEAD' });
    return desktopBuildsPublished(res.status);
  } catch {
    return desktopBuildsPublished(null);
  }
}

/** Mark every desktop download link unavailable (used when the latest.yml
 *  probe says no build is published). Idempotent; the detection highlight and
 *  platform hints are cleared too so the section reads as "coming soon". */
export function markDesktopDownloadsUnavailable(doc: Document): void {
  const section = doc.getElementById('download-view');
  if (!section) return;
  for (const link of section.querySelectorAll<HTMLAnchorElement>(
    '.desktop-download-link[data-platform]',
  )) {
    link.classList.add('is-unavailable');
    link.classList.remove('is-detected');
    link.setAttribute('aria-disabled', 'true');
    link.removeAttribute('href');
  }
  for (const hint of section.querySelectorAll<HTMLElement>('[data-platform-hint]')) {
    hint.hidden = true;
  }
}

// Best-effort desktop-OS detection from a userAgent string. Pure so Node tests
// can pin each family; the DOM consumer passes navigator.userAgent. Android
// reports "linux" in its UA but is not a desktop target, so it maps to 'other'.
export function detectDesktopPlatform(userAgent: string): DesktopPlatform {
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) return 'other';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('win')) return 'win';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  return 'other';
}

// Wire the landing download view: sync hrefs to the version constant, highlight
// the visitor's platform button (and float it first), and reveal any note keyed
// to that platform. No-ops when the view is absent (every non-index entry).
// Then, async, HEAD-probe latest.yml on the update host and mark every desktop
// link unavailable when no build is published there; the returned promise
// settles after that pass (callers may ignore it).
export function initDesktopDownload(
  doc: Document = document,
  fetcher: HeadFetcher | null = typeof fetch === 'function' ? fetch : null,
): Promise<void> {
  const section = doc.getElementById('download-view');
  if (!section) return Promise.resolve();
  const links = section.querySelectorAll<HTMLAnchorElement>(
    '.desktop-download-link[data-platform]',
  );
  for (const link of links) {
    const platform = link.dataset.platform as DesktopPlatform | undefined;
    const url = platform ? desktopDownloadUrl(platform) : null;
    link.classList.toggle('is-unavailable', !url);
    link.setAttribute('aria-disabled', url ? 'false' : 'true');
    if (url) {
      link.href = url;
    } else {
      link.removeAttribute('href');
    }
  }
  const detected = detectDesktopPlatform(navigator.userAgent);
  const actions = section.querySelector('.desktop-download-actions');
  for (const link of links) {
    const platform = link.dataset.platform as DesktopPlatform | undefined;
    const isSelf = !!platform && !!desktopDownloadUrl(platform) && platform === detected;
    link.classList.toggle('is-detected', isSelf);
    if (isSelf && actions && link !== actions.firstElementChild) actions.prepend(link);
  }
  const hints = section.querySelectorAll<HTMLElement>('[data-platform-hint]');
  for (const hint of hints) {
    const platform = hint.dataset.platformHint as DesktopPlatform | undefined;
    hint.hidden = platform !== detected || !desktopDownloadUrl(platform);
  }
  if (!fetcher) return Promise.resolve();
  return probeDesktopBuilds(fetcher).then((published) => {
    if (!published) markDesktopDownloadsUnavailable(doc);
  });
}
