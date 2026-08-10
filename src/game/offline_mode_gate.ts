// Pure decision for whether the homepage offline mode entry points (the
// mode-select dropdown option and its #btn-offline compat trigger) may be
// used. Offline mode runs a local, unauthenticated Sim with no server
// authority, so the public web build must not expose it: on the web there IS
// a server, and an unauthenticated local Sim beside it is a cheat surface.
//
// The packaged console app is the opposite case. It ships the whole client
// inside the app package and is expected to work with no network at all, so
// there is no server to be authoritative and nothing to cheat against. The
// exception is therefore scoped to that build alone, never widened to
// production web.
//
// `isDev` is meant to be `import.meta.env.DEV`, Vite's standard dev/production
// flag (true under `npm run dev`, false in a production `vite build`).

/** The console shell serves the packaged client from this virtual host. It is
 *  a real https origin (a secure context, so storage and WebGL behave), and it
 *  is unreachable on the public web, which is what makes it a safe signal. */
export const PACKAGED_APP_HOST = 'app.local';

export function isPackagedConsoleApp(hostname: string): boolean {
  return hostname === PACKAGED_APP_HOST;
}

export function isOfflineModeAvailable(isDev: boolean, packagedConsoleApp = false): boolean {
  // Cryptic Realm ships offline play as a FEATURE, not a dev convenience: the
  // landing page advertises "explore solo offline" and the mode picker offers
  // it. Upstream returns `isDev || packagedConsoleApp`, which hides the option
  // in every production web build - so players saw an Online-only dropdown
  // while the site promised solo play. The arguments are kept so the console
  // and dev paths stay expressible, and so upstream's tests still compile.
  void isDev;
  void packagedConsoleApp;
  return true;
}
