#!/usr/bin/env bash
# Auto-sync upstream world-of-claudecraft into our DEV branch.
#
#   sync-upstream.sh
#
# Fetches the upstream ClaudeCraft repo and MERGES its default branch into our
# dev branch (codex/cryptic-token-runtime). A merge (not reset/rebase) so our
# Cryptic Realm work is preserved — upstream changes layer in, ours stay.
# Pushes the result; the existing autoupdate timer then deploys dev. Promotion
# to alpha/beta/live stays on the human-reviewed promote timers.
#
# Conflicts are NOT auto-resolved: on conflict we abort the merge, leave dev
# untouched, and log loudly so a human merges. This protects the live rings —
# a bad auto-merge never reaches players (only dev, and only if it's clean).
set -euo pipefail

CR_HOME="${CR_HOME:-/opt/cryptic-realm}"
DEV_BRANCH="${CR_DEV_BRANCH:-codex/cryptic-token-runtime}"
UPSTREAM_REMOTE="${CR_UPSTREAM_REMOTE:-upstream}"
UPSTREAM_BRANCH="${CR_UPSTREAM_BRANCH:-main}"
ORIGIN="${CR_REMOTE:-origin}"
LOG="${CR_LOG_FILE:-/var/log/cr-upstream-sync.log}"

log() { echo "[$(date -u +%FT%TZ)] [upstream-sync] $*" | tee -a "$LOG"; }

cd "$CR_HOME" || { log "cd $CR_HOME failed"; exit 1; }
log "==== upstream sync start (${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH} -> ${DEV_BRANCH}) ===="

# Refuse to run on a dirty tree (a stuck deploy/edit) — that has bitten us.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "ABORT: working tree dirty; resolve before syncing"; exit 1
fi

git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" >>"$LOG" 2>&1 || { log "ABORT: upstream fetch failed"; exit 1; }
git fetch "$ORIGIN" "$DEV_BRANCH" >>"$LOG" 2>&1 || true

UP_SHA="$(git rev-parse "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}")"
git checkout "$DEV_BRANCH" >>"$LOG" 2>&1 || { log "ABORT: cannot checkout $DEV_BRANCH"; exit 1; }

# Already up to date?
if git merge-base --is-ancestor "$UP_SHA" HEAD; then
  log "dev already contains ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH} @ ${UP_SHA:0:9} — nothing to do"
  exit 0
fi

log "merging upstream @ ${UP_SHA:0:9} into ${DEV_BRANCH}…"
if git merge --no-edit -m "merge: auto-sync upstream world-of-claudecraft @ ${UP_SHA:0:9} into dev" "$UP_SHA" >>"$LOG" 2>&1; then
  git push "$ORIGIN" "$DEV_BRANCH" >>"$LOG" 2>&1 || { log "WARN: merged but push failed"; exit 1; }
  log "merged + pushed. autoupdate timer will deploy dev."
else
  log "CONFLICT: auto-merge has conflicts — aborting, dev untouched. Human merge needed."
  git merge --abort >>"$LOG" 2>&1 || true
  exit 2
fi
log "==== upstream sync done ===="
