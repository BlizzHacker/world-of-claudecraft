#!/bin/bash
# One overview sheet of the laundered assets not yet inspected individually, so
# the remaining triage is a single look rather than 18 round trips.
cd /opt/cryptic-realm || exit 1
S=tmp_audit/_rest
rm -rf $S; mkdir -p $S
SEEN="0193fba7 0193fb9a 01944c40 0195b9e3 0195be11 0193d788 0195675a 019450ce 0194183a"
i=0
for d in tmp_audit/lndout/*/; do
  k=$(basename "$d")
  h=$(echo "$k" | grep -oE '[0-9a-f]{8,12}$')
  skip=0
  for s in $SEEN; do [ "$h" = "$s" ] && skip=1; done
  [ $skip -eq 1 ] && continue
  [ -f "$d/Idle__p0__front.png" ] || continue
  short=$(echo "$k" | sed 's/^realm_//' | cut -c1-30)
  cp "$d/Idle__p0__front.png" "$S/$(printf %02d $i)_${short}.png"
  i=$((i+1))
done
echo "remaining to inspect: $i"
node montage.mjs $S tmp_audit/rest_overview.png 5 330
