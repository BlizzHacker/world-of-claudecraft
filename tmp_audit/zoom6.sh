#!/bin/bash
# Full-size look at the delta tiles that read as possible franchise characters.
cd /opt/cryptic-realm || exit 1
S=tmp_audit/_z6; rm -rf $S; mkdir -p $S
i=0
for pat in predator_warrior extremely_muscular_fem masked_shinobi_pose ninja_gaiden_pose obese_mortal_combat perfect_rig_character; do
  d=$(ls -d tmp_audit/deltaout/*"$pat"* 2>/dev/null | head -1)
  [ -z "$d" ] && { echo "MISS $pat"; continue; }
  k=$(basename "$d"); echo "$pat -> $k"
  for y in front hero; do
    [ -f "$d/Idle__p0__$y.png" ] && cp "$d/Idle__p0__$y.png" "$S/$(printf %02d $i)_${k:0:32}_$y.png" && i=$((i+1))
  done
done
node montage.mjs $S tmp_audit/zoom6.png 4 400
