#!/usr/bin/env bash
# Cryptic Realm update — pulls upstream, rebuilds, restarts all realm
# processes. Broadcasts a maintenance warning to in-game sessions before
# touching anything; flips the /opt/cryptic-realm/.maintenance flag during
# the work so the apex serves maintenance.html instead of the homepage.
#
# Usage:
#   sudo bash scripts/admin/update.sh                  # default: 5-min warn
#   CR_WARN_SECONDS=60 sudo bash scripts/admin/update.sh
#   CR_BRANCH=master   sudo bash scripts/admin/update.sh
#   CR_LOG_FILE=/var/log/cr-update.log sudo bash scripts/admin/update.sh
#
# Invoked by:
#   - Admin API: POST /admin/api/update (server/admin.ts shells out here)
#   - systemd timer: cryptic-realm-autoupdate.timer (daily 04:00 UTC)
#
# Idempotent — safe to re-run. Exits non-zero on any failure with the
# offending step in the log.

set -euo pipefail

CR_HOME="${CR_HOME:-/opt/cryptic-realm}"
CR_WARN_SECONDS="${CR_WARN_SECONDS:-300}"
CR_BRANCH="${CR_BRANCH:-feat/v07-and-realms}"
CR_LOG_FILE="${CR_LOG_FILE:-/var/log/cr-update.log}"
CR_REMOTE="${CR_REMOTE:-origin}"
CR_MAINT_FLAG="${CR_HOME}/.maintenance"
CR_INSTANCES=(infernal classic dominion arcane claudecraft exchange alpha beta)

LOG() {
  local ts msg
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  msg="$*"
  echo "[$ts] $msg" | tee -a "$CR_LOG_FILE"
}

ERR() {
  LOG "ERROR: $*"
  rm -f "$CR_MAINT_FLAG" 2>/dev/null || true
  exit 1
}

trap 'ERR "interrupted at line $LINENO"' INT TERM

cd "$CR_HOME" || ERR "cd $CR_HOME failed"

LOG "==== update start (branch=$CR_BRANCH warn=${CR_WARN_SECONDS}s) ===="

# 1. Broadcast in-game maintenance warning to every realm process.
#    We POST to each realm's internal admin API so the warning hits every
#    in-game chat. Falls back gracefully if any single realm is offline.
WARN_MSG="Server maintenance in $((CR_WARN_SECONDS / 60)) minute(s). Logs preserved."
for inst in "${CR_INSTANCES[@]}"; do
  # legacy single-realm service answers on 8787; template instances offset:
  case "$inst" in
    infernal)    port=8788 ;;
    classic)     port=8789 ;;
    dominion)    port=8790 ;;
    arcane)      port=8791 ;;
    claudecraft) port=8793 ;;
    alpha) port=8794 ;;
    beta) port=8795 ;;
    exchange)    port=8792 ;;
  esac
  if curl -fsS -m 3 -X POST \
       -H 'Content-Type: application/json' \
       -d "{\"text\":\"$WARN_MSG\"}" \
       "http://127.0.0.1:${port}/internal/broadcast" >/dev/null 2>&1; then
    LOG "broadcast OK → $inst:$port"
  else
    LOG "broadcast skipped (offline?) → $inst:$port"
  fi
done

# 2. Wait the announced warning duration so players have time to wrap up.
LOG "waiting ${CR_WARN_SECONDS}s before downtime…"
sleep "$CR_WARN_SECONDS"

# 3. Flip the maintenance flag. The server reads this file and serves
#    public/maintenance.html for any web request while it's present.
touch "$CR_MAINT_FLAG"
LOG "maintenance flag set"

# 4. Pull, install, build. Each step logged.
LOG "git fetch + pull…"
git fetch "$CR_REMOTE" --tags >> "$CR_LOG_FILE" 2>&1 || ERR "git fetch failed"
git pull --ff-only "$CR_REMOTE" "$CR_BRANCH" >> "$CR_LOG_FILE" 2>&1 \
  || ERR "git pull failed — resolve manually, then re-run"

LOG "npm install (no audit/no fund)…"
npm install --no-audit --no-fund >> "$CR_LOG_FILE" 2>&1 || ERR "npm install failed"

LOG "npm run build…"
npm run build >> "$CR_LOG_FILE" 2>&1 || ERR "build failed"

LOG "npm run build:server…"
npm run build:server >> "$CR_LOG_FILE" 2>&1 || ERR "server build failed"

# 5. Restart every realm process. The legacy single-realm service first so
#    the apex is restored quickly, then the template instances.
LOG "restarting cryptic-realm.service (apex)…"
systemctl restart cryptic-realm.service || ERR "legacy restart failed"

for inst in "${CR_INSTANCES[@]}"; do
  LOG "restarting cryptic-realm@${inst}.service…"
  systemctl restart "cryptic-realm@${inst}.service" \
    || LOG "WARN: cryptic-realm@${inst} failed to restart (continuing)"
done

# 6. Sanity check: every instance reports active.
sleep 3
SVC_FAIL=0
for inst in "${CR_INSTANCES[@]}"; do
  if [ "$(systemctl is-active "cryptic-realm@${inst}.service")" != "active" ]; then
    LOG "FAIL: cryptic-realm@${inst} is not active after restart"
    SVC_FAIL=$((SVC_FAIL + 1))
  fi
done
if [ "$(systemctl is-active cryptic-realm.service)" != "active" ]; then
  LOG "FAIL: cryptic-realm.service (legacy) is not active after restart"
  SVC_FAIL=$((SVC_FAIL + 1))
fi

# 7. Clear the maintenance flag — apex resumes serving the homepage.
rm -f "$CR_MAINT_FLAG"
LOG "maintenance flag cleared"

if [ "$SVC_FAIL" -gt 0 ]; then
  ERR "$SVC_FAIL service(s) failed restart — investigate journalctl -u cryptic-realm@<inst>"
fi

LOG "==== update done ===="
exit 0
