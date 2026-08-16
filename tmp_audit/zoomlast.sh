#!/bin/bash
cd /opt/cryptic-realm || exit 1
echo "=== average_man family in manifest"
grep -oE "^  (realm_[a-z0-9_]*average_man[a-z0-9_]*): \{" src/render/characters/manifest.generated.ts | sed 's/^  //; s/: {$//' | sort -u
echo "=== determined_chemis family"
grep -oE "^  (realm_[a-z0-9_]*chemis[a-z0-9_]*): \{" src/render/characters/manifest.generated.ts | sed 's/^  //; s/: {$//' | sort -u
echo
S=tmp_audit/_zl; rm -rf $S; mkdir -p $S
i=0
for pat in determined_chemis average_man_game average_man_pose; do
  for d in tmp_audit/deltaout2/*"$pat"* tmp_audit/deltaout/*"$pat"*; do
    [ -d "$d" ] || continue
    k=$(basename "$d")
    [ -f "$d/Idle__p0__front.png" ] || continue
    cp "$d/Idle__p0__front.png" "$S/$(printf %02d $i)_${k:6:30}.png"; i=$((i+1))
  done
done
echo "tiles: $i"
node montage.mjs $S tmp_audit/zoomlast.png 3 520
