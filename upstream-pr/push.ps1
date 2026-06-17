# Push the sanitized contribution to BlizzHacker/world-of-claudecraft and open
# the PR against levy-street/world-of-claudecraft. PowerShell version of
# push.sh for Windows users without WSL.
#
# Prereqs: gh CLI authenticated as BlizzHacker (run `gh auth status`).
#
# Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File upstream-pr/push.ps1

$ErrorActionPreference = 'Stop'

$ForkOwner     = 'BlizzHacker'
$ForkRepo      = 'world-of-claudecraft'
$UpstreamOwner = 'levy-street'
$Branch        = 'feat/oidc-sso-and-dashboards'
$StageDir      = $PSScriptRoot

$WorkDir = Join-Path $env:TEMP "wo-claudecraft-pr-$([guid]::NewGuid().ToString('N').Substring(0,8))"
Write-Host "Cloning fork into $WorkDir..."
gh repo clone "$ForkOwner/$ForkRepo" $WorkDir -- --depth=1 --branch=main
if ($LASTEXITCODE -ne 0) { throw "gh repo clone failed" }

Push-Location $WorkDir
try {
    # Branch may already exist from a prior fork action.
    git checkout -b $Branch 2>$null
    if ($LASTEXITCODE -ne 0) { git checkout $Branch }

    Write-Host "Copying sanitized files from $StageDir..."
    New-Item -ItemType Directory -Force -Path 'server', 'src/user', 'src/moderator', 'docs' | Out-Null
    Copy-Item (Join-Path $StageDir 'server/oidc.ts')              'server/oidc.ts' -Force
    Copy-Item (Join-Path $StageDir 'server/dashboard.ts')         'server/dashboard.ts' -Force
    Copy-Item (Join-Path $StageDir 'src/user/api.ts')             'src/user/api.ts' -Force
    Copy-Item (Join-Path $StageDir 'src/user/main.ts')            'src/user/main.ts' -Force
    Copy-Item (Join-Path $StageDir 'src/moderator/api.ts')        'src/moderator/api.ts' -Force
    Copy-Item (Join-Path $StageDir 'src/moderator/main.ts')       'src/moderator/main.ts' -Force
    Copy-Item (Join-Path $StageDir 'user.html')                   'user.html' -Force
    Copy-Item (Join-Path $StageDir 'mod.html')                    'mod.html' -Force
    Copy-Item (Join-Path $StageDir 'docs/sso-and-dashboards.md')  'docs/sso-and-dashboards.md' -Force

    git add -A
    if ((git diff --cached --quiet; $LASTEXITCODE) -eq 0) {
        Write-Host 'No changes to commit (already up to date).'
    } else {
        $commitMsg = @'
feat(auth): OIDC SSO + moderator/user dashboards

Adds three additive features that extend the existing admin pattern.
All opt-in; nothing breaks if you don't apply the db migration.

1. server/oidc.ts — generic OpenID Connect login via /api/oidc/{login,callback}.
   Uses .well-known/openid-configuration discovery so any conformant provider
   (Authentik / Keycloak / Auth0 / Ory Hydra / Cognito / Zitadel) works
   without code changes. Reads OIDC_ISSUER / OIDC_CLIENT_ID /
   OIDC_CLIENT_SECRET / OIDC_REDIRECT_URI from env; missing config -> routes
   return 501 and the existing /api/login keeps working.

2. server/dashboard.ts — two new route prefixes alongside /admin/api/:
   /me/api/{login,me}        any logged-in account, own-data view
   /mod/api/{login,me,queue} accounts flagged is_moderator (or is_admin)
   Same {success,data,error} envelope as the admin API. Banned / suspended
   accounts blocked at login. Admins are implicit moderators.

3. Client SPAs at /me/ and /mod/ (src/user/, src/moderator/, user.html, mod.html).
   Reuses the same Bearer-token envelope as src/admin/api.ts.

Integration details + db migration block in docs/sso-and-dashboards.md.

Pull-safe: all new files. The db.ts helpers are documented as a patch to
apply, not provided as a rewrite, so your existing schema/helpers stay
authoritative.
'@
        git commit -m $commitMsg
    }

    Write-Host "Pushing $Branch to $ForkOwner/$ForkRepo..."
    git push --set-upstream origin $Branch --force-with-lease

    Write-Host "Opening PR against $UpstreamOwner/$ForkRepo`:main..."
    $prBody = @'
## Summary

Three additive features that extend the existing admin pattern. All opt-in; nothing breaks if you don't apply the db migration.

### 1. `server/oidc.ts` — generic OpenID Connect SSO

- New routes at `/api/oidc/{login,callback}`. 302 -> provider authorize URL, callback exchanges the code, upserts the account, redirects to `/#auth_token=...&auth_user=...`.
- Provider-agnostic via `.well-known/openid-configuration` discovery — fetched once on first request, cached. Works unchanged with Authentik / Keycloak / Auth0 / Ory Hydra / Cognito / Zitadel.
- CSRF protection via short-lived `woc_oidc_state` HttpOnly+Secure+SameSite=Lax cookie.
- Reads `OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `OIDC_REDIRECT_URI` from env. Missing any -> routes 501 and the existing `/api/login` keeps working.

### 2. `server/dashboard.ts` — moderator + user tiers

Two new route prefixes alongside the existing `/admin/api/`:
- `/me/api/{login,me}` — any logged-in account, own-data view (characters on this realm, role flags, moderation status).
- `/mod/api/{login,me,queue}` — accounts flagged `is_moderator` (or `is_admin`); read-only view of the moderation queue.

Same `{success,data,error}` envelope as `server/admin.ts`. Banned / suspended accounts blocked at login. Admins are implicit moderators (one `is_admin` grant covers both).

### 3. Client SPAs

- `src/user/{api,main}.ts` + `user.html` — `/me/` — login + own characters table + role chips + standing chip.
- `src/moderator/{api,main}.ts` + `mod.html` — `/mod/` — moderator login + queue table with banned / suspended / muted / online chips.

Both link out to the other dashboards (and back to the homepage) when role flags allow.

## Integration

Three files in your existing codebase need additive edits (db schema, dispatcher, vite entry list). See `docs/sso-and-dashboards.md` for the full step-by-step.

## Test plan

- [ ] Apply the db migration block from `docs/sso-and-dashboards.md`
- [ ] Set the four `OIDC_*` env vars; restart server; confirm boot log shows `SSO: OIDC enabled at /api/oidc/login`
- [ ] Click "Sign in with OIDC" -> provider login -> land on `/#auth_token=...`; confirm app picks up the session
- [ ] `UPDATE accounts SET is_moderator = TRUE WHERE username = 'tester'`; sign in to `/mod/` as tester; queue loads
- [ ] Verify `/mod/` returns 403 for a non-mod account
- [ ] Verify existing `/admin/` and `/api/login` still work unchanged
- [ ] Unset `OIDC_*` env vars; confirm `/api/oidc/login` returns 501 and the rest of the server is unaffected

Generated with Claude Code (https://claude.com/claude-code)
'@
    $bodyFile = Join-Path $env:TEMP "woc-pr-body-$([guid]::NewGuid().ToString('N')).md"
    Set-Content -Path $bodyFile -Value $prBody -Encoding utf8

    gh pr create `
        --repo "$UpstreamOwner/$ForkRepo" `
        --base main `
        --head "$ForkOwner`:$Branch" `
        --title 'feat(auth): OIDC SSO + moderator/user dashboards' `
        --body-file $bodyFile

    if ($LASTEXITCODE -ne 0) {
        Write-Host 'gh pr create failed (PR may already exist). Check:'
        Write-Host "  https://github.com/$UpstreamOwner/$ForkRepo/pulls"
    } else {
        Write-Host "Done. PR opened. Check https://github.com/$UpstreamOwner/$ForkRepo/pulls"
    }
    Remove-Item $bodyFile -ErrorAction SilentlyContinue
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $WorkDir -ErrorAction SilentlyContinue
}
