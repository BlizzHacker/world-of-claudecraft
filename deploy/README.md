# Multi-realm deploy — Cryptic Realm

Scaffolding to run **six isolated realm processes** on LXC 171 (Proxmox 192.168.0.6),
each behind its own subdomain. Each process is its own world with its own DB
scope on the `realm` column — characters from one realm cannot enter another.
The Exchange is the only realm flagged cross-realm and accepts visiting
characters for auctions / item trade.

## Files

| Path | Purpose |
|---|---|
| `deploy/systemd/cryptic-realm@.service` | Systemd template unit, one instance per realm |
| `deploy/systemd/cryptic-realm-realms.target` | Convenience group to start/stop all six |
| `deploy/env/<realm>.env` | Per-realm `REALM_NAME` + `PORT` + `REALMS` directory |
| `deploy/traefik/crypticrealm-realms.yml` | Per-subdomain Traefik routes |

## Port + subdomain map

| Realm | Subdomain | Port |
|---|---|---|
| apex / infernal entry | `crypticrealm.com` | 8787 |
| infernal | `infernal.crypticrealm.com` | 8788 |
| classic | `classic.crypticrealm.com` | 8789 |
| dominion | `dominion.crypticrealm.com` | 8790 |
| arcane | `arcane.crypticrealm.com` | 8791 |
| exchange | `exchange.crypticrealm.com` | 8792 |
| claudecraft (upstream identity) | `claudecraft.crypticrealm.com` | 8793 |

Apex `crypticrealm.com` serves the homepage + Infernal entry via the existing
legacy `cryptic-realm.service`. Picking another realm navigates the client to
that realm's subdomain. Claudcraft is kept on its own instance and explicitly
does not inherit the Cryptic Realm SPL token env vars.

## Deploy steps

```bash
# 1. Push to LXC 171 (run from your repo on the build host, then scp/pct push)
pct push 171 deploy/systemd/cryptic-realm@.service /etc/systemd/system/cryptic-realm@.service
pct push 171 deploy/systemd/cryptic-realm-realms.target /etc/systemd/system/cryptic-realm-realms.target
pct exec 171 -- mkdir -p /opt/cryptic-realm/env.d
for r in infernal classic dominion arcane claudecraft exchange; do
  pct push 171 deploy/env/$r.env /opt/cryptic-realm/env.d/$r.env
done

# 2. Reload + enable
pct exec 171 -- systemctl daemon-reload
pct exec 171 -- systemctl enable --now cryptic-realm-realms.target

# 3. Disable the legacy single-realm service (or leave it for the homepage)
#    pct exec 171 -- systemctl disable --now cryptic-realm.service
#    — but the apex crypticrealm.com still needs ONE process serving the
#    homepage. Current live config keeps cryptic-realm.service active on :8787
#    as the Infernal entry and runs Claudcraft separately on :8793.

# 4. Traefik (LXC 107)
pct push 107 deploy/traefik/crypticrealm-realms.yml /etc/traefik/conf.d/crypticrealm-realms.yml
pct exec 107 -- systemctl reload traefik

# 5. DNS — point the five new subdomains at the same address as
#    crypticrealm.com. CNAME records work; the Traefik wildcard cert resolver
#    must cover *.crypticrealm.com (the existing certResolver: myresolver does
#    so already if it's a DNS-01 wildcard issuer).
```

## Verifying isolation

After deploy, characters created against one realm process can't appear
in another:

```bash
# From your laptop
curl https://infernal.crypticrealm.com/api/status   # → realm: "Infernal"
curl https://classic.crypticrealm.com/api/status    # → realm: "Classic"
curl https://exchange.crypticrealm.com/api/status   # → realm: "Exchange"

# Each realm's GET /api/characters (Bearer-authed) only returns rows
# whose characters.realm column matches that realm. The shared accounts
# table means one login works across all six, but characters are scoped.
```

## Rolling back

```bash
pct exec 171 -- systemctl disable --now cryptic-realm-realms.target
pct exec 171 -- systemctl enable  --now cryptic-realm.service
pct exec 107 -- rm /etc/traefik/conf.d/crypticrealm-realms.yml
pct exec 107 -- systemctl reload traefik
```

## The Exchange's special rules

- `CR_CROSS_REALM=1` is set in `deploy/env/exchange.env`. The server
  process reads this and (when wired) admits any character regardless of
  their home realm, disables combat/quest credit, and exposes the auction
  endpoints.
- Auctions live in a shared `auctions` table the Exchange writes and all
  realm processes read. Item ownership transfers from seller (any realm)
  to buyer (any realm) atomically when an auction closes.
