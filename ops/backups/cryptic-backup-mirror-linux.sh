#!/usr/bin/env bash
set -euo pipefail

SOURCE_HOST="${CR_BACKUP_SOURCE_HOST:-root@192.168.0.6}"
SOURCE_NAME="${CR_BACKUP_SOURCE_NAME:-Slimmm}"
SOURCE_ROOTS="${CR_BACKUP_SOURCE_ROOTS:-/mnt/usb1/CrypticRealmBackups/${SOURCE_NAME} /mnt/usb2/CrypticRealmBackups/${SOURCE_NAME}}"
KEEP="${CR_BACKUP_KEEP:-14}"
HOST="$(hostname -s 2>/dev/null || hostname)"
LOCK="/tmp/cryptic-usb-backup-mirror.lock"

if [[ -n "${CR_BACKUP_TARGETS:-}" ]]; then
  read -r -a TARGETS <<< "$CR_BACKUP_TARGETS"
else
  mapfile -t TARGETS < <(findmnt -rno TARGET | awk '/^\/mnt\/usb[0-9]+$/ { print }')
fi

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "Another cryptic backup mirror is already running." >&2
  exit 75
fi

REMOTE_LATEST=""
for root in $SOURCE_ROOTS; do
  latest="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$SOURCE_HOST" "cat '$root/LATEST.txt' 2>/dev/null" || true)"
  if [[ -n "$latest" ]]; then
    REMOTE_LATEST="$latest"
    break
  fi
done
if [[ -z "$REMOTE_LATEST" ]]; then
  echo "No remote latest backup found on $SOURCE_HOST." >&2
  exit 2
fi

REMOTE_NAME="$(basename "$REMOTE_LATEST")"
for target in "${TARGETS[@]}"; do
  if [[ ! -d "$target" || ! -w "$target" ]]; then
    echo "Skipping non-writable target: $target" >&2
    continue
  fi
  DEST_ROOT="$target/CrypticRealmBackups/${SOURCE_NAME}-mirror"
  DEST="$DEST_ROOT/$REMOTE_NAME"
  mkdir -p "$DEST"
  rsync -a --delete -e ssh "$SOURCE_HOST:$REMOTE_LATEST/" "$DEST/"
  {
    echo "mirror_host=$HOST"
    echo "source_host=$SOURCE_HOST"
    echo "source=$REMOTE_LATEST"
    echo "mirrored_at=$(date -u +%Y%m%dT%H%M%SZ)"
  } > "$DEST/MIRROR.txt"
  printf '%s\n' "$DEST" > "$DEST_ROOT/LATEST.txt"
  find "$DEST_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'cryptic-realm-*' \
    | sort -r | tail -n +"$((KEEP + 1))" | xargs -r rm -rf
  echo "Mirrored $REMOTE_LATEST to $DEST"
done
