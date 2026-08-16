#!/bin/bash
# Batch the 125 newly-assigned roster bodies into readable contact sheets.
cd /opt/cryptic-realm || exit 1
rm -rf tmp_audit/dsheets tmp_audit/_dg
mkdir -p tmp_audit/dsheets tmp_audit/_dg
i=0; g=0
for f in tmp_audit/_delta/*.png; do
  cp "$f" tmp_audit/_dg/
  i=$((i+1))
  if [ $((i % 20)) -eq 0 ]; then
    node montage.mjs tmp_audit/_dg "tmp_audit/dsheets/d$(printf %02d $g).png" 5 320 >/dev/null
    rm -f tmp_audit/_dg/*.png; g=$((g+1))
  fi
done
if [ -n "$(ls -A tmp_audit/_dg 2>/dev/null)" ]; then
  node montage.mjs tmp_audit/_dg "tmp_audit/dsheets/d$(printf %02d $g).png" 5 320 >/dev/null
fi
ls tmp_audit/dsheets
tar czf /opt/dsheets.tgz -C tmp_audit dsheets
