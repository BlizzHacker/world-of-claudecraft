#!/usr/bin/env bash
# Promote a ring across ALL staged realms on schedule. Driven by systemd timers:
#   promote-all.sh alpha   — every 2 weeks: alpha ← dev   (each realm)
#   promote-all.sh beta    — monthly:       beta  ← alpha
#   promote-all.sh live    — monthly:       live  ← beta
#
# Each per-realm promotion ff's the downstream branch to the upstream commit and
# redeploys only that stage (promote.sh). One realm failing doesn't stop others.
set -uo pipefail

TARGET="${1:?usage: promote-all.sh <alpha|beta|live>}"
CR_TOOLING="${CR_TOOLING:-/opt/cryptic-realm}"
LOGFILE="${CR_LOG_FILE:-/var/log/cryptic-realm-stage.log}"
REALMS=(crypticrealm infernal classic dominion arcane claudecraft fps exchange arcadevoid)

log() { echo "[$(date -u +%FT%TZ)] [promote-all ${TARGET}] $*" | tee -a "$LOGFILE"; }

case "$TARGET" in alpha|beta|live) ;; *) log "invalid target '$TARGET'"; exit 1 ;; esac

log "==== promoting ${TARGET} across all realms ===="
fail=0
for realm in "${REALMS[@]}"; do
  if bash "$CR_TOOLING/scripts/admin/promote.sh" "$realm" "$TARGET" >>"$LOGFILE" 2>&1; then
    log "OK ${realm}-${TARGET}"
  else
    log "FAILED ${realm}-${TARGET} (continuing)"
    fail=$((fail + 1))
  fi
done
log "==== done: ${#REALMS[@]} realms, ${fail} failed ===="
exit 0
