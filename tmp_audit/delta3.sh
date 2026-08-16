#!/bin/bash
# Round-3 delta: whatever the latest regeneration pulled in that no earlier pass
# has rendered, plus the rest of the halloween2025 costume batch (that batch is
# where the already-quarantined Batman and the Walter White came from, so the
# remaining members are worth an explicit look even though they read as pumpkins).
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
bash tmp_audit/mkroster.sh >/dev/null 2>&1
: > tmp_audit/delta3.txt
while read -r f; do
  k=$(basename "$f" .glb)
  seen=0
  for base in sweepout lndout ipout aliasout nbout deltaout deltaout2 famout; do
    [ -d "tmp_audit/$base/$k" ] && seen=1 && break
  done
  [ $seen -eq 0 ] && echo "$f" >> tmp_audit/delta3.txt
done < tmp_audit/roster_bodies.txt
for k in realm_arcane_halloween2025_pumpkin_monster_ba_019a178c \
         realm_arcane_wizard_chaos_halloween2025_wizar_019a17b1 \
         realm_classic_warlord_fury_halloween2025_warlo_019a1be9 \
         realm_dominion_pumpkinbot_halloween2025_hallowe_019a2be1 \
         realm_infernal_gourd_fiend_halloween2025_horror_019a178b; do
  d=0
  for base in sweepout lndout ipout aliasout nbout deltaout deltaout2 famout; do
    [ -d "tmp_audit/$base/$k" ] && d=1 && break
  done
  [ $d -eq 1 ] && continue
  f=$(find /opt/cr-realms-store -name "$k.glb" | head -1)
  [ -n "$f" ] && echo "$f" >> tmp_audit/delta3.txt
done
sort -u -o tmp_audit/delta3.txt tmp_audit/delta3.txt
echo "to render: $(wc -l < tmp_audit/delta3.txt)"
mkdir -p tmp_audit/deltaout3
node tmp_audit/phase_render1.mjs --list tmp_audit/delta3.txt --out tmp_audit/deltaout3 \
  --clips Idle --yaws front,hero --phases 0 --size 384 > tmp_audit/delta3_render.log 2>&1
echo "OK: $(grep -cE '^OK' tmp_audit/delta3_render.log)"
rm -rf tmp_audit/d3sheets tmp_audit/_d3g; mkdir -p tmp_audit/d3sheets tmp_audit/_d3g
i=0; g=0
for d in tmp_audit/deltaout3/*/; do
  k=$(basename "$d")
  [ -f "$d/Idle__p0__front.png" ] || continue
  cp "$d/Idle__p0__front.png" "tmp_audit/_d3g/$(printf %03d $i)_$(echo "$k" | sed 's/^realm_//' | cut -c1-28).png"
  i=$((i+1))
  if [ $((i % 20)) -eq 0 ]; then
    node montage.mjs tmp_audit/_d3g "tmp_audit/d3sheets/f$(printf %02d $g).png" 5 320 >/dev/null
    rm -f tmp_audit/_d3g/*.png; g=$((g+1))
  fi
done
[ -n "$(ls -A tmp_audit/_d3g 2>/dev/null)" ] && node montage.mjs tmp_audit/_d3g "tmp_audit/d3sheets/f$(printf %02d $g).png" 5 320 >/dev/null
ls tmp_audit/d3sheets
tar czf /opt/d3sheets.tgz -C tmp_audit d3sheets
