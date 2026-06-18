// Download Desktop Launcher — injects Lite + Full download cards for every
// platform into the Download view. Files don't exist yet; cards point at
// /downloads/<file> which 404 until you drop the binaries in
// public/downloads/. The cards work as a stub so the UI is ready.

const HOST_ID = 'cr-download-launchers';

interface Launcher {
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios';
  label: string;
  liteHref: string;
  fullHref: string;
  liteSizeMb: number;
  fullSizeMb: number;
  available: boolean;
}

const LAUNCHERS: Launcher[] = [
  { os: 'windows', label: 'Windows 10/11', liteHref: '/downloads/cr-launcher-lite-windows.exe', fullHref: '/downloads/cr-launcher-full-windows.exe', liteSizeMb: 12, fullSizeMb: 480, available: false },
  { os: 'macos',   label: 'macOS 12+',     liteHref: '/downloads/cr-launcher-lite-macos.dmg',   fullHref: '/downloads/cr-launcher-full-macos.dmg',   liteSizeMb: 14, fullSizeMb: 510, available: false },
  { os: 'linux',   label: 'Linux x86_64',  liteHref: '/downloads/cr-launcher-lite-linux.AppImage', fullHref: '/downloads/cr-launcher-full-linux.AppImage', liteSizeMb: 13, fullSizeMb: 500, available: false },
  { os: 'android', label: 'Android',       liteHref: '/downloads/cr-launcher-lite-android.apk', fullHref: '/downloads/cr-launcher-full-android.apk', liteSizeMb: 22, fullSizeMb: 0,   available: false },
  { os: 'ios',     label: 'iOS / iPadOS',  liteHref: 'https://apps.apple.com/app/crypticrealm', fullHref: 'https://apps.apple.com/app/crypticrealm', liteSizeMb: 22, fullSizeMb: 0,   available: false },
];

function icon(os: Launcher['os']): string {
  return ({ windows: '🪟', macos: '🍎', linux: '🐧', android: '🤖', ios: '📱' })[os];
}

function card(l: Launcher): string {
  const liteBtn = `
    <a class="cr-dl-btn${l.available ? '' : ' cr-dl-soon'}" href="${l.liteHref}" ${l.available ? 'download' : 'aria-disabled="true"'}>
      <span>Lite</span><small>${l.liteSizeMb} MB · web-based</small>
    </a>`;
  const fullBtn = l.fullSizeMb > 0
    ? `<a class="cr-dl-btn${l.available ? '' : ' cr-dl-soon'}" href="${l.fullHref}" ${l.available ? 'download' : 'aria-disabled="true"'}>
         <span>Full</span><small>${l.fullSizeMb} MB · offline + assets</small>
       </a>`
    : '';
  return `
    <div class="cr-dl-card">
      <div class="cr-dl-header"><span class="cr-dl-icon">${icon(l.os)}</span><strong>${l.label}</strong></div>
      <div class="cr-dl-row">${liteBtn}${fullBtn}</div>
      ${l.available ? '' : '<div class="cr-dl-pending">Coming soon — launchers in active build</div>'}
    </div>`;
}

function render(host: HTMLElement): void {
  host.innerHTML = `
    <div class="cr-dl-grid">
      ${LAUNCHERS.map(card).join('')}
    </div>
    <p class="cr-dl-foot">
      <strong>Lite</strong> launchers stream the realm — small download, fast start.
      <strong>Full</strong> launchers ship every realm's assets so you can play offline.
    </p>`;
}

export function mountDownloadLaunchers(): void {
  if (typeof document === 'undefined') return;
  const arm = () => {
    const target = document.getElementById('download-view') ||
                   document.querySelector('[data-view="download"]') ||
                   document.querySelector('.download-section');
    if (!target) return;
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      target.appendChild(host);
    }
    render(host as HTMLElement);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else {
    arm();
  }
  const obs = new MutationObserver(() => arm());
  obs.observe(document.body, { childList: true, subtree: true });
}
