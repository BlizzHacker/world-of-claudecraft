#!/bin/bash
# Scoped deploy: the 9 LIVE rings only, plus the 3 base units.
#
# deploy_all.sh is NOT safe on this box any more. Its line 37 does an
# unconditional `systemctl restart` over all 36 rings, and restart STARTS a
# stopped unit - so it would un-park the 27 dev/alpha/beta rings that were
# stopped AND disabled to stop the box saturating (768%+ CPU with zero players).
# This touches only units that are already running, and never enables anything.
#
# Keeps deploy_all's one hard-won guarantee: a ring is OK only if its process
# started AFTER the build it is serving. `systemctl restart` returning 0 says
# nothing - a ring once served a fresh client against a 10-hour-old server.
set -u
SHA="${1:?sha}"
cd /opt/cryptic-realm

# Guard anchored at the start of argv: matching the bare string self-matches this
# script's own wrapper shell and has faked a live deploy three times.
if ps -eo args | awk '/^bash scripts\/realm_assets\/deploy_all\.sh/' | grep -q .; then
  echo "ABORT: a real deploy_all is running"; exit 1
fi

echo "LIVEWAVE START $(date -Is) sha=$SHA"
ok=0; fail=0; stale=0; skipped=0

for r in infernal classic dominion arcane fps arcadevoid crypticrealm claudecraft exchange; do
  s=live
  d="/opt/cr-stages/$r/$s"
  unit="cryptic-realm-stage@$r-$s"
  [ -e "$d/.git" ] || { echo "SKIP $r/$s (no worktree)"; skipped=$((skipped+1)); continue; }
  # Only touch rings that are ALREADY running. Never start a parked one.
  if ! systemctl is-active --quiet "$unit"; then
    echo "PARKED $r/$s (left alone)"; skipped=$((skipped+1)); continue
  fi

  git -C "$d" fetch -q origin 2>/dev/null
  git -C "$d" checkout -f -q "$SHA" 2>/dev/null || { echo "FAIL $r/$s checkout"; fail=$((fail+1)); continue; }
  # build:server was split out of build (client-dist lane); npm run build alone
  # ships a STALE SERVER that passes the proc>=build gate. Run both, and demand
  # the server artifact is newer than the checkout.
  ( cd "$d" && npm run build > "/tmp/lw_${r}_${s}.log" 2>&1 && npm run build:server >> "/tmp/lw_${r}_${s}.log" 2>&1 ) || { echo "FAIL $r/$s build"; fail=$((fail+1)); continue; }
  ck=$(git -C "$d" log -1 --format=%ct 2>/dev/null || echo 0)
  sb=$(stat -c %Y "$d/dist-server/server.cjs" 2>/dev/null || echo 0)
  [ "$sb" -ge "$ck" ] || { echo "FAIL $r/$s server artifact older than checkout"; fail=$((fail+1)); continue; }

  bt=$(stat -c %Y "$d/dist-server/server.cjs" 2>/dev/null || echo 0)
  systemctl restart "$unit" 2>/dev/null
  sleep 3
  st=$(date -d "$(systemctl show -p ActiveEnterTimestamp --value "$unit")" +%s 2>/dev/null || echo 0)
  if systemctl is-active --quiet "$unit" && [ "$st" -ge "$bt" ]; then
    echo "OK $r/$s"; ok=$((ok+1))
  else
    echo "STALE $r/$s (started $st, built $bt)"; stale=$((stale+1))
  fi
done

# Base units serve the apex and run from /opt/cryptic-realm itself, whose build
# is stale against the checkout. Build once, restart the three that are running.
echo "--- base units"
npm run build > /tmp/lw_base.log 2>&1 && npm run build:server >> /tmp/lw_base.log 2>&1 && echo "base build ok" || echo "base build FAILED"
bbt=$(stat -c %Y /opt/cryptic-realm/dist-server/server.cjs 2>/dev/null || echo 0)
for b in crypticrealm exchange fps; do
  unit="cryptic-realm@$b"
  systemctl is-active --quiet "$unit" || { echo "PARKED base/$b"; continue; }
  systemctl restart "$unit" 2>/dev/null
  sleep 3
  st=$(date -d "$(systemctl show -p ActiveEnterTimestamp --value "$unit")" +%s 2>/dev/null || echo 0)
  if systemctl is-active --quiet "$unit" && [ "$st" -ge "$bbt" ]; then echo "OK base/$b"; ok=$((ok+1));
  else echo "STALE base/$b"; stale=$((stale+1)); fi
done

echo "LIVEWAVE COMPLETE ok=$ok stale=$stale fail=$fail skipped=$skipped"
echo "--- parked units must still be parked:"
systemctl list-units 'cryptic-realm-stage@*' --state=running --no-legend --plain | wc -l
node scripts/check_dangling.mjs 2>&1 | tail -1
python3 scripts/deployed_vs_store.py 2>&1 | tail -2
echo "LIVEWAVE DONE $(date -Is)"
