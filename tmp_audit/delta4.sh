#!/bin/bash
# Round-4 delta. Fourth regeneration; each purge reshuffles picks, so this checks
# whether the roster has finally converged on bodies that have all been looked at.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
bash tmp_audit/mkroster.sh >/dev/null 2>&1
: > tmp_audit/delta4.txt
while read -r f; do
  k=$(basename "$f" .glb)
  seen=0
  for base in sweepout lndout ipout aliasout nbout deltaout deltaout2 deltaout3 famout prout deltaout4; do
    [ -d "tmp_audit/$base/$k" ] && seen=1 && break
  done
  [ $seen -eq 0 ] && echo "$f" >> tmp_audit/delta4.txt
done < tmp_audit/roster_bodies.txt
n=$(wc -l < tmp_audit/delta4.txt)
echo "roster bodies: $(wc -l < tmp_audit/roster_bodies.txt)   never rendered: $n"
[ "$n" -eq 0 ] && { echo "CONVERGED - every roster body has been visually reviewed"; exit 0; }

mkdir -p tmp_audit/deltaout4
node tmp_audit/phase_render1.mjs --list tmp_audit/delta4.txt --out tmp_audit/deltaout4 \
  --clips Idle --yaws front,hero --phases 0 --size 384 > tmp_audit/delta4_render.log 2>&1
echo "OK: $(grep -cE '^OK' tmp_audit/delta4_render.log)"
rm -rf tmp_audit/d4sheets tmp_audit/_d4g; mkdir -p tmp_audit/d4sheets tmp_audit/_d4g
i=0; g=0
for d in tmp_audit/deltaout4/*/; do
  k=$(basename "$d")
  [ -f "$d/Idle__p0__front.png" ] || continue
  cp "$d/Idle__p0__front.png" "tmp_audit/_d4g/$(printf %03d $i)_$(echo "$k" | sed 's/^realm_//' | cut -c1-28).png"
  i=$((i+1))
  if [ $((i % 20)) -eq 0 ]; then
    node montage.mjs tmp_audit/_d4g "tmp_audit/d4sheets/g$(printf %02d $g).png" 5 320 >/dev/null
    rm -f tmp_audit/_d4g/*.png; g=$((g+1))
  fi
done
[ -n "$(ls -A tmp_audit/_d4g 2>/dev/null)" ] && node montage.mjs tmp_audit/_d4g "tmp_audit/d4sheets/g$(printf %02d $g).png" 5 320 >/dev/null
ls tmp_audit/d4sheets
tar czf /opt/d4sheets.tgz -C tmp_audit d4sheets
