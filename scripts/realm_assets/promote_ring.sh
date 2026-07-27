#!/bin/bash
# Promote ONE realm's stage-live ring to a given commit.
#
# All 8 live rings share the `live` branch, so advancing that branch would move
# every realm at once. Each ring is therefore checked out DETACHED at an explicit
# SHA — the precedent already set by infernal-live.
#
# The ring serves the public domain, so this is the step that makes changes
# visible to players. It builds in-place and restarts only that realm's service.
#
#   promote_ring.sh <realm> <sha>
set -u
REALM="${1:?realm}"
SHA="${2:?sha}"
RING="/opt/cr-stages/$REALM/live"
ENVF="/opt/cryptic-realm/env.d/$REALM-live.env"

[ -d "$RING" ] || { echo "no ring at $RING"; exit 1; }
PORT=$(grep -oE '^PORT=[0-9]+' "$ENVF" 2>/dev/null | cut -d= -f2)
[ -n "$PORT" ] || { echo "no PORT in $ENVF"; exit 1; }

echo "=== $REALM ring -> $SHA (port $PORT) ==="
BEFORE=$(git -C "$RING" rev-parse --short HEAD)
echo "  before: $BEFORE"

# Tracked-file changes would make checkout refuse; untracked backups are fine.
DIRTY=$(git -C "$RING" status --porcelain --untracked-files=no | wc -l)
if [ "$DIRTY" -ne 0 ]; then
  echo "  ABORT: ring has uncommitted TRACKED changes:"
  git -C "$RING" status --porcelain --untracked-files=no | head
  exit 1
fi

git -C "$RING" checkout --detach "$SHA" 2>&1 | tail -2 || exit 1
echo "  after: $(git -C "$RING" rev-parse --short HEAD)"

echo "  building client..."
( cd "$RING" && timeout 1800 npm run build >/tmp/ring_$REALM.log 2>&1 ) \
  || { echo "  BUILD FAILED (see /tmp/ring_$REALM.log)"; tail -12 /tmp/ring_$REALM.log; exit 1; }
echo "  building server..."
( cd "$RING" && timeout 900 npm run build:server >>/tmp/ring_$REALM.log 2>&1 ) \
  || { echo "  SERVER BUILD FAILED"; tail -12 /tmp/ring_$REALM.log; exit 1; }

systemctl restart "cryptic-realm-stage@$REALM-live"
echo "  restarted; waiting for :$PORT (can take 1-2 min under load)"
ok=0
for i in $(seq 1 90); do
  if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then ok=1; break; fi
  sleep 2
done
[ "$ok" = 1 ] || { echo "  FAILED to bind $PORT"; journalctl -u "cryptic-realm-stage@$REALM-live" -n 15 --no-pager; exit 1; }
echo "  bound :$PORT"

# Prove a generated body is actually served by THIS ring.
GLB=$(ls /mnt/usb4/moveweight-assets/cr-realms/$REALM/realm_${REALM}_*.glb 2>/dev/null | head -1)
if [ -n "$GLB" ]; then
  B=$(basename "$GLB")
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "http://127.0.0.1:$PORT/cr-realms/$REALM/$B")
  SIZE=$(curl -s -o /dev/null -w '%{size_download}' --max-time 40 "http://127.0.0.1:$PORT/cr-realms/$REALM/$B")
  echo "  GLB $B -> HTTP $CODE ($SIZE bytes)"
else
  echo "  (no generated GLB for $REALM)"
fi
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "http://127.0.0.1:$PORT/")
echo "  index -> HTTP $CODE"
echo "  $REALM DONE"
