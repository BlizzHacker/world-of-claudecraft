# Cryptic Realm — Deploy Plan for crypticrealm.com (LXC 150)

## Architecture

- **Frontend**: Vite static build → `dist/` (181MB)
- **Backend**: Node.js (esbuild bundled) → `dist-server/server.cjs` on port 8787
- **Database**: PostgreSQL (required, `DATABASE_URL` env var)
- **Reverse Proxy**: Traefik on LXC 107 → LXC 150:8787

The server serves BOTH the static files AND the WebSocket/REST API on a single port.

## Prerequisites

1. PostgreSQL running somewhere (LXC 150 or separate DB host)
2. Traefik config for `crypticrealm.com` → `192.168.0.150:8787`
3. Node.js 20+ on LXC 150

## Step 1: Push to GitHub

```bash
cd /c/MoveWeight/cryptic-realm
git add -A
git commit -m "feat: rebrand to Cryptic Realm, add 4-theme system, fix URLs/logos"
git push origin main
```

## Step 2: Server Setup (LXC 150)

```bash
ssh root@192.168.0.150

# Create app directory
mkdir -p /opt/cryptic-realm
cd /opt/cryptic-realm

# Clone the repo
git clone https://github.com/BlizzHacker/cryptic-realm.git .

# Install dependencies
npm install --production=false

# Set environment
cat > .env <<'EOF'
DATABASE_URL=postgresql://crypticrealm:PASSWORD_HERE@localhost:5432/crypticrealm
PORT=8787
CHAT_LOG_RETENTION_DAYS=90
NODE_OPTIONS=--max-old-space-size=2048
EOF

# Build frontend + server
npm run build
npm run build:server
```

## Step 3: PostgreSQL

```bash
# If PostgreSQL is on LXC 150:
apt install postgresql postgresql-contrib -y
sudo -u postgres createuser -P crypticrealm    # set password
sudo -u postgres createdb -O crypticrealm crypticrealm
```

## Step 4: Systemd Service

```bash
cat > /etc/systemd/system/cryptic-realm.service <<'EOF'
[Unit]
Description=Cryptic Realm Game Server
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/cryptic-realm
EnvironmentFile=/opt/cryptic-realm/.env
ExecStart=/usr/bin/node dist-server/server.cjs
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cryptic-realm
systemctl start cryptic-realm
systemctl status cryptic-realm
```

## Step 5: Traefik Routing (LXC 107)

```bash
ssh root@192.168.0.107

cat > /etc/traefik/conf.d/crypticrealm.yaml <<'EOF'
http:
  routers:
    crypticrealm:
      rule: "Host(`crypticrealm.com`) || Host(`www.crypticrealm.com`)"
      service: crypticrealm
      entryPoints:
        - websecure
      tls:
        certResolver: cloudflare

  services:
    crypticrealm:
      loadBalancer:
        servers:
          - url: "http://192.168.0.150:8787"
EOF

# Reload Traefik
systemctl reload traefik
```

## Step 6: Verify

```bash
# From LXC 150:
curl -s http://localhost:8787/ | head -5    # should return HTML
curl -s http://localhost:8787/api/status     # should return JSON

# From outside:
curl -sI https://crypticrealm.com/           # should return 200
```

## Step 7: Update Flow

```bash
# On LXC 150:
cd /opt/cryptic-realm
git pull origin main
npm install
npm run build
npm run build:server
systemctl restart cryptic-realm
```

## Notes

- The server handles static file serving + WebSocket + REST on ONE port (8787)
- `NODE_OPTIONS=--max-old-space-size=2048` prevents OOM on the 8GB LXC
- Static assets are cache-friendly (hashed filenames in dist/assets/)
- WebSocket upgrades are handled automatically by Traefik's default config
