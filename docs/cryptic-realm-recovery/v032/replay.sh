#!/usr/bin/env bash
# Replay every automatic + already-decided resolution for the v0.32.0 catch-up.
#
#   219 conflicts  ->  56 judgment files
#
# Nothing here is guesswork: each tier is either a mechanical engine from the
# v0.30 pass or a decision recorded in this directory with its reasoning.
#
# Usage:  bash docs/cryptic-realm-recovery/v032/replay.sh [worktree]
set -euo pipefail

REPO="${1:-/opt/cr-v032}"
V030="$REPO/docs/cryptic-realm-recovery/v030"
V032="$REPO/docs/cryptic-realm-recovery/v032"
cd "$REPO"

# The stage helper races git's index lock on a busy box, and one pass can leave
# a straggler whose sibling resolved after it was checked. Clear and run twice.
stage() {
  sed "s#/opt/cr-measure#$REPO#" "$V030/stage-resolved.sh" > /tmp/stage32.sh
  # git add races its own index lock on a loaded box, and a single pass silently
  # drops whichever file lost the race. Loop until the count stops moving.
  local prev=-1 now
  for _ in 1 2 3 4 5; do
    rm -f "$(git rev-parse --git-dir)/index.lock" 2>/dev/null || true
    bash /tmp/stage32.sh >/dev/null 2>&1 || true
    now=$(git diff --name-only --diff-filter=U | wc -l)
    [ "$now" = "$prev" ] && break
    prev=$now
  done
  echo "   remaining conflicts: $now"
}

echo "== 1. merge =="
git merge --no-ff --no-commit v0.32.0 || true
echo "   conflicts: $(git diff --name-only --diff-filter=U | wc -l)"

echo "== 2. rule plan (reuses 36 v0.30 path decisions) =="
python3 "$V032/plan.py"

echo "== 3. rule-driven hunk resolution =="
python3 "$V030/apply-rules.py" "$REPO" /tmp/rules-v032.txt >/dev/null

echo "== 4. locale overlays (order-aware union, ours wins duplicates) =="
git diff --name-only --diff-filter=U | grep 'i18n.locales/' > /tmp/locales32.txt || true
python3 "$V030/merge-locales.py" "$REPO" /tmp/locales32.txt | tail -1

echo "== 5. i18n catalogs (upstream base, fork branding overlaid) =="
sed "s#/opt/cr-measure#$REPO#" "$V030/catalog-merge.py" > /tmp/catmerge32.py
python3 /tmp/catmerge32.py | tail -1

echo "== 6. recorded decisions =="
for f in rules-precedent.txt rules-batch1.txt rules-batch2.txt; do
  python3 "$V030/apply-rules.py" "$REPO" "$V032/$f" >/dev/null
done

echo "== 7. hand-woven files =="
python3 "$V032/fix-package-json.py"
python3 "$V032/fix-weave.py"

echo "== 8. stage =="
stage

cat <<'NOTE'

== what is left ==

  72  regenerate LAST, only once the source compiles:
        tests/parity/golden/*              UPDATE_PARITY=1
        src/ui/i18n.resolved.generated/*   npm run i18n:gen
  56  judgment. See judgment-queue.md in this directory.

Also re-derive by RUNNING, never by picking a side (upstream's number is in the
tree as a placeholder): tests/command_schema.test.ts, tests/world_api_parity.test.ts,
tests/entity_roster.test.ts, tests/snapshots.test.ts, tests/ground_pickup_i18n.test.ts,
tests/combat_casting_lifecycle.test.ts.
NOTE
