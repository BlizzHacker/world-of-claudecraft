#!/bin/bash
# Four laundered ids resolve to TWO manifest keys each. Either the same model is
# registered twice or they are genuinely different files that happen to share an
# 8-hex tail - and only one of each pair got rendered. Compare by checksum so the
# answer does not depend on the name.
cd /opt/cryptic-realm || exit 1
for h in 0193fba7 019450ce 0194c860 0195b9e3; do
  echo "=== $h"
  find /opt/cr-realms-store -name "*${h}.glb" | while read -r f; do
    echo "   $(md5sum "$f" | cut -c1-12)  $(stat -c%s "$f" | numfmt --to=iec)  $f"
  done
done
