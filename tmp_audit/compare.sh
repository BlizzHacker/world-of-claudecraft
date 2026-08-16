#!/bin/bash
# Build ONE overview sheet across many candidates: for each body take the same
# three frames (rest Idle, mid Attack, mid Cheer) so silhouettes line up and a
# broken rig stands out against its neighbours.
SWEEP="${1:?sweep dir}"
OUT="${2:?out png}"
TMP=$(mktemp -d)
i=0
for d in "$SWEEP"/*/; do
  k=$(basename "$d")
  short=$(echo "$k" | sed 's/^realm_infernal_//; s/_[0-9a-f]\{8\}$//' | cut -c1-22)
  i=$((i+1))
  n=$(printf "%02d" $i)
  for f in Idle__p0__front 1H_Melee_Attack_Chop__p1__front Cheer__p1__front; do
    tag=$(echo "$f" | cut -d_ -f1)
    [ -f "$d/$f.png" ] && cp "$d/$f.png" "$TMP/${n}_${short}_${tag}.png"
  done
done
cd /opt/cryptic-realm && node montage.mjs "$TMP" "$OUT" 6 260
rm -rf "$TMP"
