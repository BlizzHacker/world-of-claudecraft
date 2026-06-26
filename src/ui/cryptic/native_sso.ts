const NATIVE_SSO_RETURN_URL = 'crypticrealm://auth/callback';
const NATIVE_SSO_START_URL = `/api/oauth/authentik?native=1&native_return=${encodeURIComponent(NATIVE_SSO_RETURN_URL)}`;

type CapacitorLike = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

type AppUrlOpenEvent = { url?: string };
type AppLaunchUrl = { url?: string | null };

function capacitor(): CapacitorLike | null {
  const cap = (globalThis as unknown as { Capacitor?: CapacitorLike }).Capacitor;
  return cap ?? null;
}

export function isNativeCapacitorApp(): boolean {
  const cap = capacitor();
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === 'function') return !!cap.isNativePlatform();
  } catch { /* fall through */ }
  try {
    const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
    return platform === 'android' || platform === 'ios';
  } catch {
    return false;
  }
}

export function nativeSsoStartUrl(): string {
  return NATIVE_SSO_START_URL;
}

export function wireNativeSsoLink(root: ParentNode = document): void {
  if (!isNativeCapacitorApp()) return;
  const link = root.querySelector<HTMLAnchorElement>('#btn-sso-authentik');
  if (!link) return;
  link.href = nativeSsoStartUrl();
  link.rel = 'noopener noreferrer';
}

export function ssoHashFromAppUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'crypticrealm:' && url.protocol !== 'com.crypticrealm.game:') return null;
    if (url.host !== 'auth') return null;
    const hash = url.hash || (url.search ? `#${url.search.slice(1)}` : '');
    return hash.startsWith('#') && hash.includes('auth_token=') ? hash : null;
  } catch {
    return null;
  }
}

export async function installNativeSsoReturnHandler(onReturn: (hash: string) => void): Promise<void> {
  if (!isNativeCapacitorApp()) return;
  try {
    const mod = await import('@capacitor/app');
    const App = mod.App as {
      addListener: (eventName: 'appUrlOpen', listenerFunc: (event: AppUrlOpenEvent) => void) => Promise<unknown>;
      getLaunchUrl?: () => Promise<AppLaunchUrl>;
    };
    await App.addListener('appUrlOpen', (event) => {
      const hash = ssoHashFromAppUrl(event.url ?? '');
      if (hash) onReturn(hash);
    });
    const launch = await App.getLaunchUrl?.();
    const launchHash = ssoHashFromAppUrl(launch?.url ?? '');
    if (launchHash) onReturn(launchHash);
  } catch (err) {
    console.error('[cr-sso] native SSO return handler failed', err);
  }
}
