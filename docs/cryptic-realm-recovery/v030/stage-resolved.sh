#!/usr/bin/env bash
# Stage every still-unmerged file that no longer contains conflict markers.
cd /opt/cr-measure
n=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if ! grep -q '^<<<<<<<\|^>>>>>>>' "$f" 2>/dev/null; then
    git add -- "$f" && n=$((n+1))
  fi
done < <(git diff --name-only --diff-filter=U)
echo "staged $n newly-resolved files"
echo "remaining conflicts: $(git diff --name-only --diff-filter=U | wc -l)"
