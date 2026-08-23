// Facebook Instant Games build stub for the Capacitor native shell packages.
//
// @capacitor/core (pulled in transitively by @capacitor/app, imported from the
// core online client src/net/online.ts) ships the native-bridge layer: it reads
// `document.cookie` (CapacitorCookies), probes `webkit.messageHandlers.bridge`
// and `androidBridge`, and registers native plugins. Inside Facebook's iframe
// there is no Capacitor runtime (NATIVE_APP is false, every use is gated on it),
// but the code still shipped and its cookie + native-bridge literals read as
// private-API access to Facebook's bundle scanner.
//
// vite.config.ts aliases the Capacitor specifiers to THIS file when
// WOC_FACEBOOK_BUNDLE=1. The exports are inert web-fallback shapes: the only one
// evaluated at import time is registerPlugin (native_apple_auth.ts calls it at
// module scope), and App/Browser methods are reached only behind NATIVE_APP,
// which is false here. Listener registrations resolve to a no-op handle so a
// stray ungated call cannot reject.

interface RemoveHandle {
  remove(): Promise<void>;
}

const noopHandle: RemoveHandle = { remove: async () => {} };

// @capacitor/app
export const App = {
  addListener: async (): Promise<RemoveHandle> => noopHandle,
  removeAllListeners: async (): Promise<void> => {},
  getLaunchUrl: async (): Promise<{ url: string } | null> => null,
  exitApp: async (): Promise<void> => {},
  minimizeApp: async (): Promise<void> => {},
};

// @capacitor/browser
export const Browser = {
  open: async (): Promise<void> => {},
  close: async (): Promise<void> => {},
  addListener: async (): Promise<RemoveHandle> => noopHandle,
  removeAllListeners: async (): Promise<void> => {},
};

// @capacitor/core: return a plugin proxy whose methods reject only if invoked
// (native-only paths, unreachable in the Facebook build). Never touches a
// native bridge, so nothing for the scanner to see.
export function registerPlugin<T = Record<string, unknown>>(name: string): T {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: () => async () => {
      throw new Error(`native plugin ${name} is unavailable in the Facebook Instant Games build`);
    },
  };
  return new Proxy({}, handler) as T;
}
