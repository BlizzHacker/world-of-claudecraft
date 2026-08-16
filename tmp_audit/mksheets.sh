#!/bin/bash
# Build one contact sheet per rendered body from an arbitrary sweep dir.
#   mksheets.sh <sweepdir> <sheetdir> <mincols>
SWEEP="${1:?sweep dir}"
SHEETS="${2:?sheet dir}"
MIN="${3:-24}"
cd /opt/cryptic-realm || exit 1
mkdir -p "$SHEETS"
for d in "$SWEEP"/*/; do
  k=$(basename "$d")
  n=$(ls "$d"/*.png 2>/dev/null | wc -l)
  if [ "$n" -lt "$MIN" ]; then echo "skip $k ($n frames)"; continue; fi
  if [ -f "$SHEETS/$k.png" ]; then echo "have $k"; continue; fi
  node montage.mjs "$d" "$SHEETS/$k.png" 8 240 >/dev/null && echo "sheet $k ($n)"
done
echo "--- $(ls "$SHEETS" | wc -l) sheets in $SHEETS"
