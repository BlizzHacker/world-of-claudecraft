#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${CR_BACKUP_APP_DIR:-/opt/cryptic-realm}"
LXC_ID="${CR_BACKUP_LXC_ID:-171}"
KEEP="${CR_BACKUP_KEEP:-14}"
HOST="$(hostname -s 2>/dev/null || hostname)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT_NAME="cryptic-realm-${HOST}-${STAMP}"
STAGE="$(mktemp -d "/tmp/${ROOT_NAME}.XXXXXX")"
LOCK="/tmp/cryptic-usb-backup.lock"

cleanup() {
  rm -rf "$STAGE"
}
trap cleanup EXIT

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "Another cryptic backup is already running." >&2
  exit 75
fi

if [[ -n "${CR_BACKUP_TARGETS:-}" ]]; then
  read -r -a TARGETS <<< "$CR_BACKUP_TARGETS"
else
  mapfile -t TARGETS < <(findmnt -rno TARGET | awk '/^\/mnt\/usb[0-9]+$/ { print }')
fi

if [[ "${#TARGETS[@]}" -eq 0 ]]; then
  echo "No USB backup targets found. Set CR_BACKUP_TARGETS." >&2
  exit 2
fi

mkdir -p "$STAGE"
{
  echo "host=$HOST"
  echo "stamp=$STAMP"
  echo "app_dir=$APP_DIR"
  echo "lxc_id=$LXC_ID"
  echo "targets=${TARGETS[*]}"
  echo "git_head=$(git -C "$APP_DIR" rev-parse --short HEAD 2>/dev/null || true)"
  echo "kernel=$(uname -a)"
} > "$STAGE/MANIFEST.txt"

if command -v pct >/dev/null 2>&1; then
  pct config "$LXC_ID" > "$STAGE/lxc-${LXC_ID}.conf" 2>/dev/null || true
  pct status "$LXC_ID" > "$STAGE/lxc-${LXC_ID}.status" 2>/dev/null || true
  pct exec "$LXC_ID" -- bash -lc 'cd /opt/cryptic-realm 2>/dev/null && git rev-parse HEAD' \
    > "$STAGE/lxc-${LXC_ID}.git-head" 2>/dev/null || true
  pct exec "$LXC_ID" -- bash -lc 'cd /opt/cryptic-realm && git bundle create /tmp/cryptic-realm.git.bundle HEAD && cat /tmp/cryptic-realm.git.bundle && rm -f /tmp/cryptic-realm.git.bundle' \
    > "$STAGE/lxc-cryptic-realm.git.bundle" 2>/dev/null || true
  pct exec "$LXC_ID" -- bash -lc 'cd /opt/cryptic-realm && tar --exclude=./.git --exclude=./node_modules --exclude=./dist --exclude=./dist-server --exclude=./dist.prev\* --exclude=./dist-server.prev\* --exclude=./.deploy-backups --exclude=./.secrets --exclude=./.env --exclude=./env.d --exclude=./classic\ realm\ assets --exclude=./claudcraft\ realm\ assets --exclude=./cryptic\ realm\ assets --exclude=./infernal\ realm\ assets -czf - .' \
    > "$STAGE/lxc-cryptic-realm-working-tree.tgz" 2>/dev/null || true
fi

systemctl list-units 'cryptic-realm*' --no-pager --plain > "$STAGE/systemd-units.txt" 2>/dev/null || true
tar -czf "$STAGE/systemd-cryptic-units.tgz" /etc/systemd/system/cryptic-realm* 2>/dev/null || true
tar -czf "$STAGE/nginx-sites.tgz" /etc/nginx 2>/dev/null || true

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" bundle create "$STAGE/cryptic-realm.git.bundle" HEAD
  git -C "$APP_DIR" status --branch --short > "$STAGE/git-status.txt" || true
  tar -C "$APP_DIR" \
    --exclude='./.git' \
    --exclude='./node_modules' \
    --exclude='./dist' \
    --exclude='./dist-server' \
    --exclude='./dist.prev*' \
    --exclude='./dist-server.prev*' \
    --exclude='./.deploy-backups' \
    --exclude='./.secrets' \
    --exclude='./.env' \
    --exclude='./classic realm assets' \
    --exclude='./claudcraft realm assets' \
    --exclude='./cryptic realm assets' \
    --exclude='./infernal realm assets' \
    -czf "$STAGE/cryptic-realm-working-tree.tgz" .
fi

if command -v pct >/dev/null 2>&1; then
  pct exec "$LXC_ID" -- bash -lc 'set -a; source /opt/cryptic-realm/.env 2>/dev/null || true; set +a; pg_dump "${DATABASE_URL:-postgres://crypticrealm:crypticrealm@localhost:5432/crypticrealm}"' \
    > "$STAGE/crypticrealm-db.sql" 2>"$STAGE/crypticrealm-db.err" || true
  gzip -f "$STAGE/crypticrealm-db.sql" 2>/dev/null || true
fi

if [[ -n "${CR_BACKUP_PASSPHRASE_FILE:-}" && -r "${CR_BACKUP_PASSPHRASE_FILE}" ]]; then
  SECRET_TAR="$STAGE/cryptic-secrets.tgz"
  tar -czf "$SECRET_TAR" \
    "$APP_DIR/.env" "$APP_DIR/env.d" "$APP_DIR/.secrets" \
    /root/.config/solana 2>/dev/null || true
  if [[ -s "$SECRET_TAR" ]]; then
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$SECRET_TAR" \
      -out "$STAGE/cryptic-secrets.tgz.enc" -pass "file:${CR_BACKUP_PASSPHRASE_FILE}"
    rm -f "$SECRET_TAR"
    echo "secrets=encrypted" >> "$STAGE/MANIFEST.txt"
  fi
else
  echo "secrets=skipped (set CR_BACKUP_PASSPHRASE_FILE)" >> "$STAGE/MANIFEST.txt"
fi

sha256sum "$STAGE"/* > "$STAGE/SHA256SUMS.txt" 2>/dev/null || true

for target in "${TARGETS[@]}"; do
  if [[ ! -d "$target" || ! -w "$target" ]]; then
    echo "Skipping non-writable target: $target" >&2
    continue
  fi
  DEST="$target/CrypticRealmBackups/$HOST/$ROOT_NAME"
  mkdir -p "$DEST"
  rsync -a --delete "$STAGE/" "$DEST/"
  printf '%s\n' "$DEST" > "$target/CrypticRealmBackups/$HOST/LATEST.txt"
  find "$target/CrypticRealmBackups/$HOST" -mindepth 1 -maxdepth 1 -type d -name 'cryptic-realm-*' \
    | sort -r | tail -n +"$((KEEP + 1))" | xargs -r rm -rf
  echo "Wrote $DEST"
done
