#!/bin/bash
# Build one contact sheet per rendered body: rows = clip (Attack/Idle/Walk),
# cols = phase x yaw (p0 front, p0 hero, p1 front, ... p3 hero).
cd /opt/cryptic-realm
mkdir -p /tmp/sheets
for d in /tmp/sweep36/*/; do
  k=$(basename "$d")
  n=$(ls "$d"/*.png 2>/dev/null | wc -l)
  if [ "$n" -lt 24 ]; then echo "skip $k ($n frames)"; continue; fi
  if [ -f "/tmp/sheets/$k.png" ]; then continue; fi
  node montage.mjs "$d" "/tmp/sheets/$k.png" 8 240 >/dev/null && echo "sheet $k"
done
ls /tmp/sheets | wc -l
