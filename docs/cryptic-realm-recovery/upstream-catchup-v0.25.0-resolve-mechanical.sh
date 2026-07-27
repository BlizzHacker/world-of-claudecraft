#!/usr/bin/env bash
# Step 1 of the v0.25.0 merge: resolve only the mechanical categories.
# Generated files are staged from upstream then REGENERATED afterwards, so the
# staged bytes here are throwaway - never hand-merged.
set -uo pipefail
cd /opt/cr-v030

echo "=== A. accept upstream deletions - options window revert precedent ==="
for f in src/ui/options_ia.ts src/ui/options_mobile_shell.ts tests/options_mobile_shell.test.ts; do
  if git status --porcelain -- "$f" | grep -q '^UD'; then
    git rm -q --force "$f" && echo "  deleted: $f"
  fi
done

echo "=== B. package-lock.json -> upstream, npm install reconciles later ==="
if git status --porcelain -- package-lock.json | grep -q '^UU'; then
  git checkout --theirs -- package-lock.json && git add package-lock.json && echo "  staged upstream package-lock.json"
fi

echo "=== C. parity goldens -> upstream, regenerate with UPDATE_PARITY=1 ==="
n=0
while IFS= read -r f; do
  git checkout --theirs -- "$f" 2>/dev/null && git add "$f" && n=$((n+1))
done < <(git diff --name-only --diff-filter=U | grep '^tests/parity/')
echo "  staged $n parity goldens"

echo "=== D. i18n resolved generated -> upstream, regenerate via i18n:gen ==="
n=0
while IFS= read -r f; do
  git checkout --theirs -- "$f" 2>/dev/null && git add "$f" && n=$((n+1))
done < <(git diff --name-only --diff-filter=U | grep 'i18n\.resolved\.generated')
echo "  staged $n i18n generated files"

echo "=== E. other generated -> upstream, regenerate by their scripts ==="
for f in src/guide/content.generated.ts src/render/assets/manifest.generated.ts; do
  if git status --porcelain -- "$f" | grep -q '^UU'; then
    git checkout --theirs -- "$f" && git add "$f" && echo "  staged: $f"
  fi
done

echo
echo "=== remaining conflicts ==="
git diff --name-only --diff-filter=U | wc -l
echo "--- by area ---"
rem=$(git diff --name-only --diff-filter=U)
printf '%s\n' "$rem" > /tmp/conf25_remaining.txt
echo -n "  i18n locales: "; grep -c 'i18n\.locales' /tmp/conf25_remaining.txt
echo -n "  server/:      "; grep -c '^server/' /tmp/conf25_remaining.txt
echo -n "  src/:         "; grep -c '^src/' /tmp/conf25_remaining.txt
echo -n "  tests/:       "; grep -c '^tests/' /tmp/conf25_remaining.txt
echo -n "  root/other:   "; grep -vcE '^(server|src|tests)/' /tmp/conf25_remaining.txt
