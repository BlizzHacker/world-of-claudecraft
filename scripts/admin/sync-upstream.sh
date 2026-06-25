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
SYNC_WORKTREE="${CR_SYNC_WORKTREE:-/tmp/cryptic-realm-upstream-sync-worktree}"

log() { echo "[$(date -u +%FT%TZ)] [upstream-sync] $*" | tee -a "$LOG"; }

cd "$CR_HOME" || { log "cd $CR_HOME failed"; exit 1; }
log "==== upstream sync start (${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH} -> ${DEV_BRANCH}) ===="

# Merge from a detached temp worktree so stage worktrees can keep dev checked out.
case "$SYNC_WORKTREE" in
  /tmp/cryptic-realm-upstream-sync*) ;;
  *) log "ABORT: unsafe CR_SYNC_WORKTREE path: $SYNC_WORKTREE"; exit 1 ;;
esac
cleanup_worktree() {
  git -C "$CR_HOME" worktree remove --force "$SYNC_WORKTREE" >>"$LOG" 2>&1 || rm -rf "$SYNC_WORKTREE"
}

# Full (non-shallow) fetch: a shallow clone can't find the common ancestor and
# git then refuses with "unrelated histories" even though our repo descends from
# upstream. Unshallow if needed so the merge sees shared history.
git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" >>"$LOG" 2>&1 || { log "ABORT: upstream fetch failed"; exit 1; }
if [ -f "$(git rev-parse --git-dir)/shallow" ]; then
  log "repo is shallow — fetching full history for a valid merge base…"
  # Deepen both remotes to full depth so the shared ancestor (our prior upstream
  # merges) is present. --unshallow can no-op on partially-deepened repos, so
  # also force a very large depth as a fallback.
  git fetch --unshallow "$ORIGIN" >>"$LOG" 2>&1 || true
  git fetch "$ORIGIN" --depth=2147483647 '+refs/heads/*:refs/remotes/origin/*' >>"$LOG" 2>&1 || true
  git fetch "$UPSTREAM_REMOTE" "$UPSTREAM_BRANCH" --depth=2147483647 >>"$LOG" 2>&1 || true
fi
git fetch "$ORIGIN" "$DEV_BRANCH" >>"$LOG" 2>&1 || true

UP_SHA="$(git rev-parse "${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH}")"
DEV_SHA="$(git rev-parse "${ORIGIN}/${DEV_BRANCH}")"
git worktree prune >>"$LOG" 2>&1 || true
cleanup_worktree
git worktree add --detach "$SYNC_WORKTREE" "$DEV_SHA" >>"$LOG" 2>&1 \
  || { log "ABORT: cannot create detached sync worktree for $DEV_BRANCH"; exit 1; }

# If there's still no common ancestor, this is a genuinely unrelated tree — do
# NOT force it (would mangle dev). Bail for a human.
if ! git -C "$SYNC_WORKTREE" merge-base HEAD "$UP_SHA" >/dev/null 2>&1; then
  log "ABORT: no common ancestor between dev and upstream — manual review needed"
  cleanup_worktree
  exit 3
fi

# Already up to date?
if git -C "$SYNC_WORKTREE" merge-base --is-ancestor "$UP_SHA" HEAD; then
  log "dev already contains ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH} @ ${UP_SHA:0:9} — nothing to do"
  cleanup_worktree
  exit 0
fi

log "merging upstream @ ${UP_SHA:0:9} into ${DEV_BRANCH}…"
REPORT="${CR_SYNC_REPORT:-/var/log/cr-upstream-sync-conflict.md}"
if git -C "$SYNC_WORKTREE" merge --no-edit -m "merge: auto-sync upstream world-of-claudecraft @ ${UP_SHA:0:9} into dev" "$UP_SHA" >>"$LOG" 2>&1; then
  git -C "$SYNC_WORKTREE" push "$ORIGIN" "HEAD:${DEV_BRANCH}" >>"$LOG" 2>&1 || { log "WARN: merged but push failed"; cleanup_worktree; exit 1; }
  log "merged + pushed. autoupdate timer will deploy dev."
  # Clear any stale conflict report from a previous failed run.
  rm -f "$REPORT" 2>/dev/null || true
  cleanup_worktree
else
  # Capture WHICH files conflicted before aborting, into a human-readable report
  # so a maintainer can act without spelunking the raw log. The merge is aborted
  # so dev stays clean and the live rings are never reached by a bad auto-merge.
  CONFLICTS="$(git -C "$SYNC_WORKTREE" diff --name-only --diff-filter=U 2>/dev/null || true)"
  N="$(printf '%s\n' "$CONFLICTS" | grep -c . || true)"
  {
    echo "# Cryptic Realm upstream auto-sync — CONFLICT"
    echo
    echo "- When: $(date -u +%FT%TZ)"
    echo "- Upstream: ${UPSTREAM_REMOTE}/${UPSTREAM_BRANCH} @ ${UP_SHA}"
    echo "- Dev branch: ${DEV_BRANCH} @ ${DEV_SHA}"
    echo "- Conflicted files: ${N}"
    echo
    echo "## Files needing a human merge"
    echo '```'
    printf '%s\n' "$CONFLICTS"
    echo '```'
    echo
    echo "## To resolve (locally)"
    echo '```'
    echo "git fetch upstream main && git checkout ${DEV_BRANCH}"
    echo "git merge upstream/main   # resolve the files above, see memory crypticrealm_upstream_sync_v0_11"
    echo "git push origin ${DEV_BRANCH}"
    echo '```'
  } > "$REPORT" 2>/dev/null || true
  log "CONFLICT: ${N} files conflict — aborting, dev untouched. Report: ${REPORT}"
  git -C "$SYNC_WORKTREE" merge --abort >>"$LOG" 2>&1 || true
  cleanup_worktree
  exit 2
fi
log "==== upstream sync done ===="
