#!/usr/bin/env bash
# Replay the mechanical half of the v0.32.0 catch-up merge.
#
# The on-disk merge state is deliberately not trusted (the v0.30 pass proved it
# fragile). This script reproduces every automatic resolution from a clean start,
# so the only thing a human ever hand-resolves is the judgment queue.
#
#   219 conflicts  ->  73 judgment files
#
# Usage:  bash docs/cryptic-realm-recovery/v032/replay.sh [worktree]
set -euo pipefail

REPO="${1:-/opt/cr-v032}"
V030="$REPO/docs/cryptic-realm-recovery/v030"
cd "$REPO"

echo "== 1. merge =="
git merge --no-ff --no-commit v0.32.0 || true
echo "   conflicts: $(git diff --name-only --diff-filter=U | wc -l)"

echo "== 2. build the rule plan =="
# Reuses a v0.30 decision wherever the same path conflicts again (36 of them),
# and derives ours/theirs for files where only one side contributed.
python3 "$REPO/docs/cryptic-realm-recovery/v032/plan.py"

echo "== 3. rule-driven hunk resolution =="
python3 "$V030/apply-rules.py" "$REPO" /tmp/rules-v032.txt

echo "== 4. locale overlays (order-aware union, ours wins duplicates) =="
git diff --name-only --diff-filter=U | grep 'i18n.locales/' > /tmp/locales32.txt || true
python3 "$V030/merge-locales.py" "$REPO" /tmp/locales32.txt

echo "== 5. i18n catalogs (upstream base, fork branding overlaid) =="
sed "s#/opt/cr-measure#$REPO#" "$V030/catalog-merge.py" > /tmp/catmerge32.py
python3 /tmp/catmerge32.py | tail -2

echo "== 6. documented precedents =="
# options_window.ts: the fork inlined its own options IA, ~1100 fork lines
# against 1-17 upstream per hunk. Upstream's chatWindowResetRow / framesRow /
# markDialogRoot / renderBugReport are deliberately NOT re-ported.
python3 "$V030/apply-rules.py" "$REPO" "$REPO/docs/cryptic-realm-recovery/v032/rules-precedent.txt"

echo "== 7. stage everything with no markers left =="
sed "s#/opt/cr-measure#$REPO#" "$V030/stage-resolved.sh" > /tmp/stage32.sh
bash /tmp/stage32.sh

cat <<'NOTE'

== what is left ==

  72  regenerate LAST, only once the source compiles:
        tests/parity/golden/*          UPDATE_PARITY=1
        src/ui/i18n.resolved.generated/*   npm run i18n:gen
  73  judgment. See docs/cryptic-realm-recovery/v032/judgment-queue.md

Do NOT open with "regenerate the goldens": they cannot be rebuilt until the
judgment files compile. The mechanical tier is the last step, not the first.
NOTE
