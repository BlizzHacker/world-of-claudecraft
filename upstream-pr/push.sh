#!/usr/bin/env bash
# Push the sanitized contribution to BlizzHacker/world-of-claudecraft and open
# the PR against levy-street/world-of-claudecraft.
#
# Prereqs: gh CLI authenticated as BlizzHacker (gh auth status).
#
# Run from the repo root:
#   bash upstream-pr/push.sh

set -euo pipefail

FORK_OWNER="BlizzHacker"
FORK_REPO="world-of-claudecraft"
UPSTREAM_OWNER="levy-street"
BRANCH="feat/oidc-sso-and-dashboards"
STAGE_DIR="$(dirname "$(realpath "$0")")"

WORKDIR="$(mktemp -d)"
trap "rm -rf '$WORKDIR'" EXIT

echo "→ Cloning fork into $WORKDIR…"
gh repo clone "${FORK_OWNER}/${FORK_REPO}" "$WORKDIR" -- --depth=1 --branch=main

cd "$WORKDIR"
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
git rm -rf --cached --quiet . >/dev/null 2>&1 || true

echo "→ Copying sanitized files from $STAGE_DIR…"
mkdir -p server src/user src/moderator docs
cp "$STAGE_DIR/server/oidc.ts"           server/oidc.ts
cp "$STAGE_DIR/server/dashboard.ts"      server/dashboard.ts
cp "$STAGE_DIR/src/user/api.ts"          src/user/api.ts
cp "$STAGE_DIR/src/user/main.ts"         src/user/main.ts
cp "$STAGE_DIR/src/moderator/api.ts"     src/moderator/api.ts
cp "$STAGE_DIR/src/moderator/main.ts"    src/moderator/main.ts
cp "$STAGE_DIR/user.html"                user.html
cp "$STAGE_DIR/mod.html"                 mod.html
cp "$STAGE_DIR/docs/sso-and-dashboards.md"  docs/sso-and-dashboards.md

git add -A

git commit -m "feat(auth): OIDC SSO + moderator/user dashboards

Adds three additive features that extend the existing admin pattern.
All opt-in; nothing breaks if you don't apply the db migration.

1. server/oidc.ts — generic OpenID Connect login via /api/oidc/{login,callback}.
   Uses .well-known/openid-configuration discovery so any conformant provider
   (Authentik / Keycloak / Auth0 / Ory Hydra / Cognito / Zitadel) works
   without code changes. Reads OIDC_ISSUER / OIDC_CLIENT_ID /
   OIDC_CLIENT_SECRET / OIDC_REDIRECT_URI from env; missing config → routes
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
authoritative."

echo "→ Pushing $BRANCH to ${FORK_OWNER}/${FORK_REPO}…"
git push --set-upstream origin "$BRANCH" --force-with-lease

echo "→ Opening PR against ${UPSTREAM_OWNER}/${FORK_REPO}:main…"
gh pr create \
  --repo "${UPSTREAM_OWNER}/${FORK_REPO}" \
  --base main \
  --head "${FORK_OWNER}:${BRANCH}" \
  --title "feat(auth): OIDC SSO + moderator/user dashboards" \
  --body "$(cat <<'BODY'
## Summary

Three additive features that extend the existing admin pattern. All opt-in; nothing breaks if you don't apply the db migration.

### 1. `server/oidc.ts` — generic OpenID Connect SSO

- New routes at \`/api/oidc/{login,callback}\`. 302 → provider authorize URL, callback exchanges the code, upserts the account, redirects to \`/#auth_token=…&auth_user=…\`.
- Provider-agnostic via \`.well-known/openid-configuration\` discovery — fetched once on first request, cached. Works unchanged with Authentik / Keycloak / Auth0 / Ory Hydra / Cognito / Zitadel.
- CSRF protection via short-lived \`woc_oidc_state\` HttpOnly+Secure+SameSite=Lax cookie.
- Reads \`OIDC_ISSUER\` / \`OIDC_CLIENT_ID\` / \`OIDC_CLIENT_SECRET\` / \`OIDC_REDIRECT_URI\` from env. Missing any → routes 501 and the existing \`/api/login\` keeps working.

### 2. `server/dashboard.ts` — moderator + user tiers

Two new route prefixes alongside the existing \`/admin/api/\`:
- \`/me/api/{login,me}\` — any logged-in account, own-data view (characters on this realm, role flags, moderation status).
- \`/mod/api/{login,me,queue}\` — accounts flagged \`is_moderator\` (or \`is_admin\`); read-only view of the moderation queue.

Same \`{success,data,error}\` envelope as \`server/admin.ts\`. Banned / suspended accounts blocked at login. Admins are implicit moderators (one \`is_admin\` grant covers both).

### 3. Client SPAs

- \`src/user/{api,main}.ts\` + \`user.html\` — \`/me/\` — login + own characters table + role chips + standing chip.
- \`src/moderator/{api,main}.ts\` + \`mod.html\` — \`/mod/\` — moderator login + queue table with banned / suspended / muted / online chips.

Both link out to the other dashboards (and back to the homepage) when role flags allow.

## Integration

Three files in your existing codebase need additive edits (db schema, dispatcher, vite entry list). See \`docs/sso-and-dashboards.md\` for the full step-by-step.

## Test plan

- [ ] Apply the db migration block from \`docs/sso-and-dashboards.md\`
- [ ] Set the four \`OIDC_*\` env vars; restart server; confirm boot log shows \`SSO: OIDC enabled at /api/oidc/login\`
- [ ] Click "Sign in with OIDC" → provider login → land on \`/#auth_token=…\`; confirm app picks up the session
- [ ] \`UPDATE accounts SET is_moderator = TRUE WHERE username = 'tester'\`; sign in to \`/mod/\` as tester; queue loads
- [ ] Verify \`/mod/\` returns 403 for a non-mod account
- [ ] Verify existing \`/admin/\` and \`/api/login\` still work unchanged
- [ ] Unset \`OIDC_*\` env vars; confirm \`/api/oidc/login\` returns 501 and the rest of the server is unaffected

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"

echo "Done. Check the PR on https://github.com/${UPSTREAM_OWNER}/${FORK_REPO}/pulls"
