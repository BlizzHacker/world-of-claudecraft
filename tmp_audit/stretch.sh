#!/bin/bash
# Edge-stretch per clip for every reachable body. All 28 share ONE clip bank
# (meshy_clip_bank), so a body that tears where another does not is a skinning
# fault, not a clip fault. Normalised per 1000 edges so the low-poly bank and
# the 300k-vert Meshy bank can be read on the same scale.
cd /opt/cryptic-realm
echo "body|idleWorst|idleGt2|walkWorst|walkGt2|atkWorst|atkGt2"
while read -r f; do
  b=$(basename "$f" .glb)
  out=$(node scripts/reweight_topo.mjs --input "$f" --stretch Idle,Walk,Attack 2>/dev/null)
  iw=$(echo "$out" | awk '/^  Idle /{print $2}'   | sed 's/worst=//')
  i2=$(echo "$out" | awk '/^  Idle /{for(i=1;i<=NF;i++) if($i ~ /^>2x:/){sub(/>2x:/,"",$i); print $i}}')
  ww=$(echo "$out" | awk '/^  Walk /{print $2}'   | sed 's/worst=//')
  w2=$(echo "$out" | awk '/^  Walk /{for(i=1;i<=NF;i++) if($i ~ /^>2x:/){sub(/>2x:/,"",$i); print $i}}')
  aw=$(echo "$out" | awk '/^  Attack /{print $2}' | sed 's/worst=//')
  a2=$(echo "$out" | awk '/^  Attack /{for(i=1;i<=NF;i++) if($i ~ /^>2x:/){sub(/>2x:/,"",$i); print $i}}')
  echo "$b|$iw|$i2|$ww|$w2|$aw|$a2"
done < /opt/cryptic-realm/tmp_audit/uniq.txt
