#!/bin/bash
# Batch round-2 delta tiles into sheets that stay under the 2000px read limit.
cd /opt/cryptic-realm || exit 1
rm -rf tmp_audit/d2sheets tmp_audit/_d2g
mkdir -p tmp_audit/d2sheets tmp_audit/_d2g
i=0; g=0
for f in tmp_audit/_delta2/*.png; do
  cp "$f" tmp_audit/_d2g/
  i=$((i+1))
  if [ $((i % 20)) -eq 0 ]; then
    node montage.mjs tmp_audit/_d2g "tmp_audit/d2sheets/e$(printf %02d $g).png" 5 320 >/dev/null
    rm -f tmp_audit/_d2g/*.png; g=$((g+1))
  fi
done
[ -n "$(ls -A tmp_audit/_d2g 2>/dev/null)" ] && node montage.mjs tmp_audit/_d2g "tmp_audit/d2sheets/e$(printf %02d $g).png" 5 320 >/dev/null
ls tmp_audit/d2sheets
tar czf /opt/d2sheets.tgz -C tmp_audit d2sheets
