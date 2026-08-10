#!/bin/bash
# Scoped deploy: the LIVE rings plus the base units that are actually running.
#
# THE DEFAULT DEPLOY PATH since the 2026-08-09 capacity parking. deploy_all.sh
# restarts every ring unconditionally, and `systemctl restart` STARTS a stopped
# unit - so on a box where the dev/alpha/beta rings are parked (stopped AND
# disabled because an empty v0.35 ring idles at ~43% of a core), running it
# silently un-parks all 27 and re-saturates the host. This script touches only
# units that are ALREADY running and never enables anything.
#
# Keeps deploy_all's hard-won guarantee: a ring is OK only if its process
# started AFTER the build it is serving (`systemctl restart` returning 0 says
# nothing - a ring once served a fresh client against a 10-hour-old server).
#
#   deploy_live_rings.sh <sha>
set -u
SHA="${1:?usage: deploy_live_rings.sh <sha>}"
cd /opt/cryptic-realm

# Guard anchored at the start of argv: matching the bare string self-matches
# this script's own wrapper shell and has faked a live deploy before.
if ps -eo args | awk '/^bash scripts\/realm_assets\/deploy_all\.sh|^bash scripts\/realm_assets\/deploy_live_rings\.sh/' | grep -v "$$" | grep -q .; then
  echo "ABORT: another deploy is running"; exit 1
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
  # -f because the build dirties the worktree it built in (generated artifacts
  # are tracked); a stage worktree holds no work worth keeping.
  git -C "$d" checkout -f -q "$SHA" 2>/dev/null || { echo "FAIL $r/$s checkout"; fail=$((fail+1)); continue; }
  # install: the sha may carry a different dependency set than the last deploy
  # (the v0.35.1 intake did); npm install on an unchanged set is cheap.
  if ! ( cd "$d" \
      && timeout 1500 npm install --no-audit --no-fund > "/tmp/lw_${r}_${s}.log" 2>&1 \
      && timeout 1800 npm run build >> "/tmp/lw_${r}_${s}.log" 2>&1 \
      && timeout 900 npm run build:server >> "/tmp/lw_${r}_${s}.log" 2>&1 ); then
    echo "FAIL $r/$s build"; fail=$((fail+1)); tail -3 "/tmp/lw_${r}_${s}.log"; continue
  fi

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

# Base units serve the apex/exchange/fps and run from /opt/cryptic-realm
# itself. Build once, restart only the ones that are running.
echo "--- base units"
if ! ( timeout 1500 npm install --no-audit --no-fund > /tmp/lw_base.log 2>&1 \
    && timeout 1800 npm run build >> /tmp/lw_base.log 2>&1 \
    && timeout 900 npm run build:server >> /tmp/lw_base.log 2>&1 ); then
  echo "base build FAILED"; tail -3 /tmp/lw_base.log
else
  echo "base build ok"
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
fi

echo "LIVEWAVE COMPLETE ok=$ok stale=$stale fail=$fail skipped=$skipped"
echo "--- running stage units (parked ones must stay parked):"
systemctl list-units 'cryptic-realm-stage@*' --state=running --no-legend --plain | wc -l
node scripts/check_dangling.mjs 2>&1 | tail -1
python3 scripts/deployed_vs_store.py 2>&1 | tail -2
echo "LIVEWAVE DONE $(date -Is)"
