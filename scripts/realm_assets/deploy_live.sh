#!/bin/bash
# Restart the base game services against the freshly built dist and PROVE the
# bodies are actually served — not just that a unit went green.
#
# Note on topology: the public *.crypticrealm.com domains are served by the
# stage-live RINGS in /opt/cr-stages/<realm>/live, NOT by /opt/cryptic-realm.
# This script validates the base services (ports 8788+) first, because that is
# where the build we just produced actually runs. Ring promotion is a separate,
# per-realm step and is deliberately not automated here.
set -u
cd /opt/cryptic-realm
REALMS="${1:-infernal classic dominion arcane fps}"

echo "=== restart base services ==="
for r in $REALMS; do
  systemctl restart "cryptic-realm@$r" 2>/dev/null && echo "  restarted $r" || echo "  NO UNIT $r"
done

echo "=== wait for ports ==="
for r in $REALMS; do
  PORT=$(grep -oE '^PORT=[0-9]+' "env.d/$r.env" 2>/dev/null | cut -d= -f2)
  [ -z "$PORT" ] && { echo "  $r: no PORT in env.d/$r.env"; continue; }
  ok=0
  for i in $(seq 1 45); do
    if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then ok=1; break; fi
    sleep 2
  done
  if [ "$ok" = 1 ]; then echo "  $r listening on $PORT"; else echo "  $r FAILED to bind $PORT"; continue; fi

  # Prove a generated body is actually served over HTTP from this port.
  KEY=$(ls /mnt/usb4/moveweight-assets/cr-realms/$r/realm_${r}_*.glb 2>/dev/null | head -1)
  if [ -n "$KEY" ]; then
    BASE=$(basename "$KEY")
    CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
      "http://127.0.0.1:$PORT/cr-realms/$r/$BASE")
    SIZE=$(curl -s -o /dev/null -w '%{size_download}' --max-time 30 \
      "http://127.0.0.1:$PORT/cr-realms/$r/$BASE")
    echo "    GLB $BASE -> HTTP $CODE (${SIZE} bytes)"
  else
    echo "    no generated GLB found for $r"
  fi
done

echo "=== bundle carries the keys ==="
CHUNK=$(grep -l "realm_dominion_\|realm_arcane_" dist/assets/*.js 2>/dev/null | head -1)
echo "  chunk: $(basename "${CHUNK:-none}")"
for r in $REALMS; do
  n=$(grep -o "realm_${r}_[a-z0-9_]*" "$CHUNK" 2>/dev/null | sort -u | wc -l)
  printf '  %-10s %s keys\n' "$r" "$n"
done

echo "=== service health ==="
for r in $REALMS; do
  printf '  %-12s %s\n' "$r" "$(systemctl is-active "cryptic-realm@$r" 2>/dev/null)"
done
