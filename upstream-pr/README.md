# Upstream PR — OIDC SSO + moderator/user dashboards

Sanitized, generic versions of three modules we built on top of `world-of-claudecraft`. Provider-neutral, no deploy specifics, no realm packs — the kind of additive code the upstream maintainers can drop into `main` without inheriting any of our opinions.

## Files in this directory

```
upstream-pr/
├── server/
│   ├── oidc.ts             # /api/oidc/{login,callback} — generic OIDC SSO
│   └── dashboard.ts        # /me/api/* + /mod/api/* handlers
├── src/
│   ├── user/
│   │   ├── api.ts          # /me/ dashboard API wrapper
│   │   └── main.ts         # /me/ dashboard SPA
│   └── moderator/
│       ├── api.ts          # /mod/ dashboard API wrapper
│       └── main.ts         # /mod/ dashboard SPA
├── user.html               # /me/ HTML shell
├── mod.html                # /mod/ HTML shell
├── docs/
│   └── sso-and-dashboards.md   # integration guide + db migration block
├── push.sh                 # one-liner: clone fork → commit → push → open PR
└── README.md               # this file
```

## How to push it upstream

The Claude Code auto-mode classifier blocked the direct `mcp__plugin_github_github__push_files` call ("external repo exfiltration") even though you authorized it. So we staged the files here and provided a script.

**On Windows (PowerShell, no WSL):**
```powershell
# Prereq: gh CLI logged in as BlizzHacker
gh auth status

# Run from the repo root
powershell -ExecutionPolicy Bypass -File upstream-pr/push.ps1
```

**On Linux/macOS/WSL bash:**
```bash
gh auth status
bash upstream-pr/push.sh
```

The script does the following:

1. Clones https://github.com/BlizzHacker/world-of-claudecraft (the fork created earlier) into a temp dir.
2. Checks out the `feat/oidc-sso-and-dashboards` branch.
3. Copies the sanitized files from this directory.
4. Commits + pushes to `BlizzHacker/world-of-claudecraft:feat/oidc-sso-and-dashboards`.
5. Opens a PR against `levy-street/world-of-claudecraft:main` with the title `feat(auth): OIDC SSO + moderator/user dashboards`.

The script is idempotent — re-run it after editing files in this directory and it re-pushes (with `--force-with-lease`) and re-opens the PR if needed.

## What was sanitized vs. what we use internally

| Upstream-friendly | Our internal version |
|---|---|
| `OIDC_*` env vars (provider-neutral) | `AUTHENTIK_*` env vars |
| `/api/oidc/login` route prefix | `/api/oauth/authentik` |
| `woc_oidc_state` cookie name | `cr_oauth_state` |
| `woc_user_token` / `woc_mod_token` localStorage keys | `cryptic-realm_user_token` etc. |
| Plain HTML shells with stock WoC color tokens | CR-themed shells importing realm CSS |
| `PROVIDER = 'oidc'` upserts into accounts | `PROVIDER = 'authentik'` |
| No deploy / infra references | LXC 171 / Traefik / Authentik instance details |
| No realm-specific code | Realm registry + branding overlay + Exchange realm |

The realm registry pattern (`src/sim/realms/`, `src/ui/cryptic/`) was deliberately **not** included in this PR — too opinionated and tied to our 6-realm structure. Happy to upstream a generic version later if the maintainers express interest.
