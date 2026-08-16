#!/bin/bash
cd /opt/cryptic-realm || exit 1
D=$(git diff src/render/characters/manifest.generated.ts)
echo "manifest added lines:      $(printf '%s\n' "$D" | grep -c '^+[^+]')"
echo "manifest removed entries:  $(printf '%s\n' "$D" | grep -cE '^-  realm_[a-z0-9_]+: \{')"
echo "manifest removed refs:     $(printf '%s\n' "$D" | grep -cE "^-[[:space:]]+'realm_[a-z0-9_]+',?$")"
echo "HEAD entry count:          $(git show HEAD:src/render/characters/manifest.generated.ts | grep -cE '^  realm_[a-z0-9_]+: \{')"
echo "working entry count:       $(grep -cE '^  realm_[a-z0-9_]+: \{' src/render/characters/manifest.generated.ts)"
echo
echo "roster: HEAD vs now, entries whose visualKey changed:"
git show HEAD:src/sim/realms/rosters.generated.ts | grep -oE "id: '[a-z_]+'.*visualKey: '[a-z0-9_]+'" | sed -E "s/id: '([a-z_]+)'.*visualKey: '([a-z0-9_]+)'/\1 \2/" | sort > /tmp/h.txt
grep -oE "id: '[a-z_]+'.*visualKey: '[a-z0-9_]+'" src/sim/realms/rosters.generated.ts | sed -E "s/id: '([a-z_]+)'.*visualKey: '([a-z0-9_]+)'/\1 \2/" | sort > /tmp/n.txt
echo "  changed: $(join /tmp/h.txt /tmp/n.txt -o 0 2>/dev/null | wc -l) ids present in both"
comm -12 <(cut -d' ' -f1 /tmp/h.txt) <(cut -d' ' -f1 /tmp/n.txt) | wc -l | sed 's/^/  shared ids: /'
diff <(cat /tmp/h.txt) <(cat /tmp/n.txt) | grep -c '^<' | sed 's/^/  rows differing: /'
