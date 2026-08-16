#!/bin/bash
# Full-roster IP sweep. Two yaws of the rest Idle pose per body is enough to
# recognise a copied character; the phase sweep that proves a rig is alive is a
# separate question and not what this pass is for.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
mkdir -p tmp_audit/sweepout tmp_audit/sweepsheets

node tmp_audit/phase_render1.mjs \
  --list tmp_audit/roster_bodies.txt \
  --out tmp_audit/sweepout \
  --clips Idle --yaws front,hero --phases 0 --size 384 \
  > tmp_audit/sweep_render.log 2>&1

echo "rendered dirs: $(ls tmp_audit/sweepout | wc -l)" >> tmp_audit/sweep_render.log

# Contact sheets in batches of 12 bodies so each sheet stays readable.
cd tmp_audit/sweepout || exit 1
i=0; batch=0
rm -rf /opt/cryptic-realm/tmp_audit/_stage
mkdir -p /opt/cryptic-realm/tmp_audit/_stage
for d in */; do
  k=${d%/}
  short=$(echo "$k" | sed 's/^realm_//; s/_[0-9a-f]\{8\}$//' | cut -c1-30)
  if [ -f "$d/Idle__p0__front.png" ]; then
    n=$(printf "%03d" $i)
    cp "$d/Idle__p0__front.png" "/opt/cryptic-realm/tmp_audit/_stage/${n}_${short}.png"
    i=$((i+1))
  fi
  if [ $((i % 12)) -eq 0 ] && [ $i -gt 0 ]; then
    b=$(printf "%02d" $batch)
    cd /opt/cryptic-realm && node montage.mjs tmp_audit/_stage "tmp_audit/sweepsheets/batch_$b.png" 4 300 >/dev/null 2>&1
    rm -f /opt/cryptic-realm/tmp_audit/_stage/*.png
    batch=$((batch+1))
    cd /opt/cryptic-realm/tmp_audit/sweepout || exit 1
  fi
done
if [ -n "$(ls -A /opt/cryptic-realm/tmp_audit/_stage 2>/dev/null)" ]; then
  b=$(printf "%02d" $batch)
  cd /opt/cryptic-realm && node montage.mjs tmp_audit/_stage "tmp_audit/sweepsheets/batch_$b.png" 4 300 >/dev/null 2>&1
fi
echo "SWEEP DONE sheets=$(ls /opt/cryptic-realm/tmp_audit/sweepsheets | wc -l)" >> /opt/cryptic-realm/tmp_audit/sweep_render.log
