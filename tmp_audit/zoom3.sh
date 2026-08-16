#!/bin/bash
# Three sweep tiles worth a second look at full size: a small robed green mage,
# a white long-headed sentinel, and a body whose ORIGINAL prompt named a Masters
# of the Universe character ("trap jaw") even though the render read generic.
cd /opt/cryptic-realm || exit 1
S=tmp_audit/_zoom3; rm -rf $S; mkdir -p $S
i=0
for pat in mystic_goblin_mage neo_samurai_senti game_figure_trap_jaw; do
  d=$(ls -d tmp_audit/sweepout/*"$pat"* 2>/dev/null | head -1)
  [ -z "$d" ] && { echo "no dir for $pat"; continue; }
  k=$(basename "$d")
  echo "$pat -> $k"
  for y in front hero; do
    [ -f "$d/Idle__p0__$y.png" ] && cp "$d/Idle__p0__$y.png" "$S/$(printf %02d $i)_${k:0:34}_$y.png" && i=$((i+1))
  done
done
node montage.mjs $S tmp_audit/zoom3.png 2 460
