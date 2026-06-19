#!/usr/bin/env bash
# Stand up all 4 stages (live/beta/alpha/dev) for one realm on this host.
# Idempotent: safe to re-run. Does NOT touch any other realm or the existing
# flat cryptic-realm@ instances.
#
#   setup-realm-stages.sh <realm> [stages...]
#   e.g. setup-realm-stages.sh crypticrealm            # all 4 stages
#        setup-realm-stages.sh crypticrealm dev live   # just these
set -euo pipefail

REALM="${1:?usage: setup-realm-stages.sh <realm> [stages...]}"
shift || true
STAGES=("$@")
[ ${#STAGES[@]} -eq 0 ] && STAGES=(live beta alpha dev)

CR_TOOLING="${CR_TOOLING:-/opt/cryptic-realm}"
UNIT_SRC="${CR_TOOLING}/deploy/systemd/cryptic-realm-stage@.service"
UNIT_DST="/etc/systemd/system/cryptic-realm-stage@.service"
LOGFILE="${CR_LOG_FILE:-/var/log/cryptic-realm-stage.log}"
log() { echo "[$(date -u +%FT%TZ)] [setup ${REALM}] $*" | tee -a "$LOGFILE"; }

# 1. Generate env.d files for every realm/stage (cheap, overwrites generated set).
log "regenerating stage env files"
( cd "$CR_TOOLING" && node scripts/admin/gen-stage-env.mjs ) 2>>"$LOGFILE"

# 2. Install the stage template unit if missing/changed.
if ! cmp -s "$UNIT_SRC" "$UNIT_DST" 2>/dev/null; then
  log "installing $UNIT_DST"
  cp "$UNIT_SRC" "$UNIT_DST"
  systemctl daemon-reload
fi

# 3. Build + enable each stage.
for stage in "${STAGES[@]}"; do
  inst="${REALM}-${stage}"
  log "=== ${inst} ==="
  # deploy-stage.sh creates the worktree, builds it, and restarts the unit.
  # On first run the unit isn't enabled yet, so enable it before deploy builds.
  systemctl enable "cryptic-realm-stage@${inst}.service" >>"$LOGFILE" 2>&1 || true
  "$CR_TOOLING/scripts/admin/deploy-stage.sh" "$REALM" "$stage"
done

log "done — stages: ${STAGES[*]}"
systemctl --no-pager list-units "cryptic-realm-stage@${REALM}-*" 2>/dev/null || true
