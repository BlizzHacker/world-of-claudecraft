# Cloudflare Turnstile setup (captcha on register/login)

The upstream code is already wired — set the env vars and it activates.

## 1. Create a widget at https://dash.cloudflare.com → Turnstile

- **Domain**: `crypticrealm.com` (and add `*.crypticrealm.com` for the realm subdomains).
- **Widget mode**: Managed (recommended).
- Copy the **Site Key** (public) and **Secret Key** (private).

## 2. Add to server env

```bash
ssh root@192.168.0.6 'pct exec 171 -- bash -c "cat >> /opt/cryptic-realm/.env"' <<EOF

# Cloudflare Turnstile
TURNSTILE_SECRET=<your-secret-key>
VITE_TURNSTILE_SITEKEY=<your-site-key>
EOF
```

## 3. Rebuild + restart

The site key is a build-time var (`VITE_*`), so the client bundle must be rebuilt:

```bash
ssh root@192.168.0.6 'pct exec 171 -- bash -c "cd /opt/cryptic-realm && npm run build && systemctl restart cryptic-realm.service cryptic-realm-realms.target"'
```

That's it. Register / login forms now require a Turnstile challenge; `/api/register` and `/api/login` return 403 if the token doesn't verify.
