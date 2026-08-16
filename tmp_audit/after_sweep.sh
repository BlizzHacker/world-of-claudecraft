#!/bin/bash
# Render the 32 laundered-but-still-live assets once the roster sweep frees the
# browser. Same fixed-camera idle shot, so these sit alongside the sweep sheets.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome

while ! grep -q 'SWEEP DONE' tmp_audit/sweep_render.log 2>/dev/null; do sleep 10; done

node tmp_audit/resolve_laundered.mjs 2>/dev/null \
  | sed -n '/still live; render list/,$p' | tail -n +2 | grep '^/' > tmp_audit/laundered.txt
echo "laundered to render: $(wc -l < tmp_audit/laundered.txt)" > tmp_audit/laundered_render.log

mkdir -p tmp_audit/lndout tmp_audit/lndsheets
node tmp_audit/phase_render1.mjs \
  --list tmp_audit/laundered.txt \
  --out tmp_audit/lndout \
  --clips Idle --yaws front,hero --phases 0 --size 384 \
  >> tmp_audit/laundered_render.log 2>&1

for d in tmp_audit/lndout/*/; do
  k=$(basename "$d")
  [ -f "tmp_audit/lndsheets/$k.png" ] && continue
  node montage.mjs "$d" "tmp_audit/lndsheets/$k.png" 2 420 >/dev/null 2>&1
done
echo "LAUNDERED DONE sheets=$(ls tmp_audit/lndsheets | wc -l)" >> tmp_audit/laundered_render.log
