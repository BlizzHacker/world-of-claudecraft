#!/usr/bin/env bash
# One-jump merge (recovery line -> upstream/main = v0.30.0): mechanical categories.
# Generated files are staged from upstream as THROWAWAY bytes and must be
# regenerated afterwards; they are never hand-merged.
set -uo pipefail
cd /opt/cr-measure

echo "=== A. accept upstream deletions ==="
# critters.ts: upstream removed ambient critters in f31a1be67 and added
# tests/ambient_critters_removed.test.ts asserting the module is gone. Fork
# venues only mention critters in decoration-exclusion COMMENTS - nothing
# imports it - so accepting the deletion loses no fork feature.
# options_ia.ts / options_mobile_shell.ts: v0.24.1 reverted PR #1736 these were
# built on; v0.26.0-intake precedent deletes them and re-ports onto upstream's
# options window.
# i18n.resolved.sha256 / i18n.status.summary.json: upstream dropped these
# artifacts entirely, so there is nothing to regenerate.
for f in src/render/critters.ts \
         src/ui/options_ia.ts \
         src/ui/options_mobile_shell.ts \
         tests/options_mobile_shell.test.ts \
         src/ui/i18n.resolved.sha256 \
         src/ui/i18n.status.summary.json; do
  if git status --porcelain -- "$f" 2>/dev/null | grep -q '^UD'; then
    git rm -q --force "$f" && echo "  deleted: $f"
  fi
done

echo "=== B. package-lock -> upstream, npm install reconciles ==="
if git status --porcelain -- package-lock.json 2>/dev/null | grep -q '^UU'; then
  git checkout --theirs -- package-lock.json && git add package-lock.json && echo "  staged package-lock.json"
fi

stage_group () { # $1 = grep pattern, $2 = label
  local n=0
  while IFS= read -r f; do
    git checkout --theirs -- "$f" 2>/dev/null && git add "$f" && n=$((n+1))
  done < <(git diff --name-only --diff-filter=U | grep -E "$1")
  echo "  $2: staged $n"
}

echo "=== C. regenerable, staged from upstream then regenerated ==="
stage_group '^tests/parity/'            'parity goldens'
stage_group 'i18n\.resolved\.generated' 'i18n resolved-generated'
stage_group 'content\.generated'        'guide content.generated'
stage_group 'manifest\.generated'       'assets manifest.generated'

echo
echo "=== remaining conflicts ==="
git diff --name-only --diff-filter=U > /tmp/conf_oj_remaining.txt
wc -l < /tmp/conf_oj_remaining.txt
echo "--- by area ---"
L=/tmp/conf_oj_remaining.txt
printf '  i18n.locales : %s\n' "$(grep -c 'i18n\.locales' $L)"
printf '  i18n.catalog : %s\n' "$(grep -c 'i18n\.catalog' $L)"
printf '  server/      : %s\n' "$(grep -c '^server/' $L)"
printf '  src/ other   : %s\n' "$(grep '^src/' $L | grep -vc 'i18n')"
printf '  tests/       : %s\n' "$(grep -c '^tests/' $L)"
printf '  other        : %s\n' "$(grep -vcE '^(server|src|tests)/' $L)"
