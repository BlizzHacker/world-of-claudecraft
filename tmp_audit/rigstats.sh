#!/bin/bash
# Bind-pose rig stats for every reachable infernal body.
#  span   = bind-pose X extent / height. >0.85 means the mesh is STORED with the
#           arms out (T-pose) - if the arm surface is also core-weighted the arms
#           never leave that pose, which is the "kite" defect.
#  verts  = welded vertex count (tells the low-poly bank from the Meshy bank)
cd /opt/cryptic-realm
echo "body|verts|height|spanX|spanRatio|armPct|surfArm|coreOnArm"
while read -r f; do
  b=$(basename "$f" .glb)
  out=$(node scripts/reweight_topo.mjs --input "$f" --analyze 2>/dev/null)
  verts=$(echo "$out" | grep -oP 'welded=\K[0-9]+' | head -1)
  line=$(echo "$out" | grep 'bbox min=' | head -1)
  minx=$(echo "$line" | sed -E 's/.*bbox min=\[([^,]*),.*/\1/')
  maxx=$(echo "$line" | sed -E 's/.*max=\[([^,]*),.*/\1/')
  h=$(echo "$line" | grep -oP 'height=\K[0-9.]+')
  armpct=$(echo "$out" | grep -m1 'shell verts=' | grep -oP 'arm=\K[0-9]+%')
  sa=$(echo "$out" | grep -oP 'surface-arm verts \(armness>=0.7\): \K[0-9]+')
  co=$(echo "$out" | grep -oP 'core weight >0.3: \K[0-9]+')
  ratio=$(awk -v a="$minx" -v b="$maxx" -v c="$h" 'BEGIN{ if(c>0) printf "%.3f", (b-a)/c; else print "?" }')
  spanx=$(awk -v a="$minx" -v b="$maxx" 'BEGIN{printf "%.3f", b-a}')
  echo "$b|$verts|$h|$spanx|$ratio|$armpct|$sa|$co"
done < /opt/cryptic-realm/tmp_audit/uniq.txt
