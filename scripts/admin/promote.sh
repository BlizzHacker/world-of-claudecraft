#!/usr/bin/env bash
# Promote a realm stage by fast-forwarding its branch to the upstream stage's
# current commit, then redeploying just that stage.
#
#   promote.sh <realm> <alpha|beta|live>
#
#   alpha ← dev    (run every 2 weeks)
#   beta  ← alpha  (run monthly)
#   live  ← beta   (run monthly)
#
# Promotion is a fast-forward of the downstream branch ref on origin, so the
# exact code testers vetted moves forward verbatim. dev is never a promotion
# target (it tracks the moving dev branch directly).
set -euo pipefail

REALM="${1:?usage: promote.sh <realm> <alpha|beta|live>}"
TARGET="${2:?usage: promote.sh <realm> <alpha|beta|live>}"

CR_TOOLING="${CR_TOOLING:-/opt/cryptic-realm}"
REMOTE="${CR_REMOTE:-origin}"
LOGFILE="${CR_LOG_FILE:-/var/log/cryptic-realm-stage.log}"
log() { echo "[$(date -u +%FT%TZ)] [promote ${REALM}/${TARGET}] $*" | tee -a "$LOGFILE"; }

case "$TARGET" in
  alpha) FROM='codex/cryptic-token-runtime'; TO='alpha' ;;
  beta)  FROM='alpha'; TO='beta' ;;
  live)  FROM='beta';  TO='live' ;;
  *) log "invalid target '$TARGET' (alpha|beta|live)"; exit 1 ;;
esac

git -C "$CR_TOOLING" fetch "$REMOTE" --tags >>"$LOGFILE" 2>&1

FROM_SHA="$(git -C "$CR_TOOLING" rev-parse "$REMOTE/$FROM")"
log "advancing $TO → $FROM @ ${FROM_SHA:0:9}"

# Move the downstream branch ref to the upstream commit. Force-push the branch
# (it's a release ring, only ever moved forward by this script).
git -C "$CR_TOOLING" branch -f "$TO" "$FROM_SHA"
git -C "$CR_TOOLING" push "$REMOTE" "$TO" >>"$LOGFILE" 2>&1

log "redeploy ${REALM}-${TARGET}"
bash "$CR_TOOLING/scripts/admin/deploy-stage.sh" "$REALM" "$TARGET"
log "done"
