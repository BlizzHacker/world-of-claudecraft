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

# FROM = upstream GIT branch the downstream ring fast-forwards to.
# FROM_STAGE = upstream STAGE whose characters migrate down (dev→alpha→beta→live).
case "$TARGET" in
  alpha) FROM='codex/cryptic-token-runtime'; FROM_STAGE='dev';   TO='alpha' ;;
  beta)  FROM='alpha';                       FROM_STAGE='alpha'; TO='beta'  ;;
  live)  FROM='beta';                        FROM_STAGE='beta';  TO='live'  ;;
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

# Migrate characters FROM the upstream stage realm TO this one (re-point the
# realm column). Done AFTER the downstream stage is rebuilt+running so the
# characters land on a live process. The realm-guard on saveCharacterState
# (server/db.ts) protects against a lingering upstream autosave clobbering a
# moved row. dev is the source for alpha; alpha for beta; beta for live.
if command -v node >/dev/null 2>&1 && [ -f "$CR_TOOLING/scripts/admin/ladder-admin.mjs" ]; then
  FROM_STAGE_NAME="$(node -e "import('file://$CR_TOOLING/scripts/admin/stages.config.mjs').then(m=>console.log(m.stageRealmName('$REALM','$FROM_STAGE')))" 2>/dev/null)"
  TO_STAGE_NAME="$(node -e "import('file://$CR_TOOLING/scripts/admin/stages.config.mjs').then(m=>console.log(m.stageRealmName('$REALM','$TARGET')))" 2>/dev/null)"
  if [ -n "$FROM_STAGE_NAME" ] && [ -n "$TO_STAGE_NAME" ]; then
    log "migrate characters \"$FROM_STAGE_NAME\" -> \"$TO_STAGE_NAME\""
    ( cd "$CR_TOOLING" && node scripts/admin/ladder-admin.mjs migrate "$FROM_STAGE_NAME" "$TO_STAGE_NAME" ) >>"$LOGFILE" 2>&1 \
      || log "WARN character migration failed (check DATABASE_URL); code promoted, chars not moved"
  else
    log "WARN could not resolve stage realm names; skipping character migration"
  fi
fi
log "done"
