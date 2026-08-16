#!/bin/bash
# Regeneration reshuffles picks (pool indices shift when keys are removed), so the
# roster now contains bodies that were never in the vetted set. Render exactly
# those, otherwise the audit has a hole the size of the reshuffle.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome

bash tmp_audit/mkroster.sh >/dev/null 2>&1
: > tmp_audit/delta2.txt
while read -r f; do
  k=$(basename "$f" .glb)
  seen=0
  for base in sweepout lndout ipout aliasout nbout deltaout famout; do
    [ -d "tmp_audit/$base/$k" ] && seen=1 && break
  done
  [ $seen -eq 0 ] && echo "$f" >> tmp_audit/delta2.txt
done < tmp_audit/roster_bodies.txt

echo "roster bodies now: $(wc -l < tmp_audit/roster_bodies.txt)"
echo "never rendered:    $(wc -l < tmp_audit/delta2.txt 2>/dev/null || echo 0)"

if [ -s tmp_audit/delta2.txt ]; then
  mkdir -p tmp_audit/deltaout2
  node tmp_audit/phase_render1.mjs --list tmp_audit/delta2.txt --out tmp_audit/deltaout2 \
    --clips Idle --yaws front,hero --phases 0 --size 384 > tmp_audit/delta2_render.log 2>&1
  echo "rendered OK: $(grep -cE '^OK' tmp_audit/delta2_render.log)"
  grep '^FAIL' tmp_audit/delta2_render.log | head
  S=tmp_audit/_delta2; rm -rf $S; mkdir -p $S
  i=0
  for d in tmp_audit/deltaout2/*/; do
    k=$(basename "$d")
    [ -f "$d/Idle__p0__front.png" ] || continue
    cp "$d/Idle__p0__front.png" "$S/$(printf %03d $i)_$(echo "$k" | sed 's/^realm_//' | cut -c1-28).png"
    i=$((i+1))
  done
  node montage.mjs $S tmp_audit/delta2_overview.png 5 320
fi
