# Abandoned realm_config wiring — preserved for the record

Found uncommitted in the worktree `/opt/cr-stages/claudecraft/live` on
2026-07-26. Preserved here because a ring deploy or promote would silently
discard it, and it existed in no commit on any branch.

**It is superseded. Do not re-apply it.** Evidence that the whole
`realm_config` path was abandoned on 2026-07-22 in favour of the
`realm_visuals` + Authentik bridge:

- `server/realm_visuals.ts` already ships the same `class:`/`hero:`/`npc:`/`mob:`
  assignment with revisioning, DB backing and permission gating, and is wired.
- On LXC 150, `backend/app/realm_config_bridge.py` is imported by **nothing**;
  `backend/app/realm_sync.py` (2026-07-22 11:44) replaced it.
- The shared secret this wiring depended on is absent from the live
  `arcforge-studio/.env`; it survives only in `.env.before-realm-sync-20260722`.
- The wiring was never compiled into any running build: the endpoints
  `/realm/api/npc-roster` and `/realm/api/class-visuals` return the SPA
  `text/html` catch-all on `:8850`, byte-identical to a nonexistent route, and
  14 days of journals show zero callers.
- `server/realm_config.ts` never type-checked (it imported
  `loadClassVisualConfig` and `loadInfernalConfig`, neither of which exists).

The module itself is preserved verbatim in commit `5a82df674`. The ring held a
near-identical copy differing only in two lines, which used
`payload = JSON.parse(body)` where the newer copy used
`payload = body as Partial<...>` — i.e. the ring copy predates `readBody`
returning parsed JSON.

Also in that ring, the same diff wired `asset_library`
(`/api/asset-library`, `/asset-library/`). That half was a stopgap and is
**already committed** properly on the recovery line — `cf68347c8:server/main.ts`
contains it, the ring's base `923667914` does not. Nothing was lost there.

## The patch, as found

```diff
diff --git a/server/main.ts b/server/main.ts
index b06f36051..5320ff7f8 100644
--- a/server/main.ts
+++ b/server/main.ts
@@ -136,6 +136,7 @@ import { maybeHandleExchangeApi } from './exchange/api';
 import { applyExchangeSchema } from './exchange/db';
 import { maybeHandleContributionsApi } from './contributions';
 import { handleCrRealmsStatic, handleForgedCatalog, handleForgedStatic } from './forged_assets';
+import { handleAssetLibraryCatalog, handleAssetLibraryStatic } from './asset_library';
 import { GameServer } from './game';
 import {
   handleGitHubCallback,
@@ -224,6 +225,7 @@ import {
 } from './ratelimit';
 import { createPgRateLimitStore } from './ratelimit_db';
 import { isPublicCorsPath, publicOriginFromRequest, REALM, REALM_DIRECTORY, REALM_ORIGINS } from './realm';
+import { handleRealmClassVisuals, handleRealmNpcRoster, loadRealmConfig } from './realm_config';
 import { resolveReportTarget } from './report_target';
 import { BUG_REPORT_MAX_BODY_BYTES, configureReportsRuntime } from './reports';
 import { handleSitePresenceHeartbeat } from './site_presence';
@@ -2435,8 +2437,16 @@ export function routeHttpRequest(req: http.IncomingMessage, res: http.ServerResp
   // other /api route keeps the narrow realm/native allowlist.
   const publicCorsPath = isPublicCorsPath(path);
   if (applyCorsAndPreflight(req, res, isApi, publicCorsPath)) return;
+  if (path.startsWith('/asset-library/')) {
+    void handleAssetLibraryStatic(req, res);
+    return;
+  }
   if (handleForgedStatic(req, res)) return;
   if (handleCrRealmsStatic(req, res)) return;
+  if (path === '/api/asset-library') {
+    void handleAssetLibraryCatalog(req, res);
+    return;
+  }
   if (path === '/api/forged-props') {
     void handleForgedCatalog(req, res);
     return;
@@ -2448,11 +2458,12 @@ export function routeHttpRequest(req: http.IncomingMessage, res: http.ServerResp
   // security headers set above and carry their own Cache-Control: no-store.
   if (req.method === 'GET' && path === '/livez') handleLivez(res);
   else if (req.method === 'GET' && path === '/readyz') handleReadyz(res);
-  // /metrics is bearer-gated by config.metricsToken: feature-off 404 when unset,
-  // 401 on a missing/wrong bearer, exposition only on a match (see handleMetricsGate).
-  // /livez and /readyz stay open above.
   else if (req.method === 'GET' && path === '/metrics')
     void handleMetricsGate(req, res, httpMetrics, activeConfig().metricsToken);
+  else if (url.startsWith("/realm/api/npc-roster"))
+    void handleRealmNpcRoster(req, res);
+  else if (url.startsWith('/realm/api/class-visuals'))
+    void handleRealmClassVisuals(req, res);
   else if (url.startsWith('/internal/')) {
     // The flag-gated internal dispatcher; its delegate is the exact pre-migration
     // composite (daily-rewards ops tried first, then handleInternalApi), so the
@@ -2584,6 +2595,7 @@ export async function startServer(): Promise<http.Server> {
   await game.loadMail();
   await game.loadChatFilter();
   await game.loadBlockedIps();
+  await loadRealmConfig();
   void game.recordOnlineSnapshot();
   void currentSitePresenceUsers()
     .then((count) => recordSitePresenceSample(count))
```
