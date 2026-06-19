#!/usr/bin/env bash
# Deploy a single realm STAGE without touching any other stage or realm.
#
#   deploy-stage.sh <realm> <stage>
#   e.g. deploy-stage.sh crypticrealm dev
#
# Each stage lives in its own git worktree under /opt/cr-stages/<realm>/<stage>,
# pinned to that stage's branch (CR_GIT_REF in env.d/<realm>-<stage>.env). We
# fetch, fast-forward that worktree to its ref, build IN that worktree, then
# restart only cryptic-realm@<realm>-<stage>. Live/beta/alpha stay frozen at
# their refs; only promote.sh advances them.
set -euo pipefail

REALM="${1:?usage: deploy-stage.sh <realm> <stage>}"
STAGE="${2:?usage: deploy-stage.sh <realm> <stage>}"
INST="${REALM}-${STAGE}"

CR_TOOLING="${CR_TOOLING:-/opt/cryptic-realm}"        # repo with the bare/clone + scripts
STAGES_ROOT="${STAGES_ROOT:-/opt/cr-stages}"
WORKTREE="${STAGES_ROOT}/${REALM}/${STAGE}"
ENVFILE="${CR_TOOLING}/env.d/${INST}.env"
REMOTE="${CR_REMOTE:-origin}"
LOGFILE="${CR_LOG_FILE:-/var/log/cryptic-realm-stage.log}"

log() { echo "[$(date -u +%FT%TZ)] [$INST] $*" | tee -a "$LOGFILE"; }

[ -f "$ENVFILE" ] || { log "missing $ENVFILE — run gen-stage-env + install first"; exit 1; }

# Resolve the branch this stage tracks.
REF="$(grep -E '^CR_GIT_REF=' "$ENVFILE" | head -1 | cut -d= -f2-)"
REF="${REF:-codex/cryptic-token-runtime}"

# Create the worktree on first deploy.
if [ ! -d "$WORKTREE/.git" ] && [ ! -f "$WORKTREE/.git" ]; then
  log "creating worktree $WORKTREE @ $REF"
  mkdir -p "$(dirname "$WORKTREE")"
  git -C "$CR_TOOLING" fetch "$REMOTE" --tags
  git -C "$CR_TOOLING" worktree add --force "$WORKTREE" "$REF" 2>>"$LOGFILE" \
    || git -C "$CR_TOOLING" worktree add --force -B "$REF" "$WORKTREE" "$REMOTE/$REF"
fi

log "fetch + ff $REF"
git -C "$WORKTREE" fetch "$REMOTE" --tags >>"$LOGFILE" 2>&1
# dev tracks a moving branch; live/beta/alpha are advanced only by promote.sh,
# but we still ff to their current ref so a fresh promotion is picked up.
git -C "$WORKTREE" checkout -q "$REF" 2>>"$LOGFILE" || true
git -C "$WORKTREE" merge --ff-only "$REMOTE/$REF" >>"$LOGFILE" 2>&1 \
  || git -C "$WORKTREE" reset --hard "$REMOTE/$REF" >>"$LOGFILE" 2>&1

log "npm install + build (this worktree only)"
( cd "$WORKTREE" && npm install --no-audit --no-fund >>"$LOGFILE" 2>&1 && npm run build >>"$LOGFILE" 2>&1 ) \
  || { log "build failed — stage NOT restarted, previous build still serving"; exit 1; }

log "restart cryptic-realm-stage@${INST}"
systemctl restart "cryptic-realm-stage@${INST}.service"
sleep 1
systemctl is-active --quiet "cryptic-realm-stage@${INST}.service" \
  && log "OK active" \
  || { log "FAILED to become active"; systemctl status "cryptic-realm-stage@${INST}.service" --no-pager | tail -15; exit 1; }
