#!/bin/bash
# Rebuild the render queue from what is NOT yet complete (24 frames).
cd /opt/cryptic-realm/tmp_audit
: > remain.txt
while read -r f; do
  b=$(basename "$f" .glb)
  n=$(ls "/tmp/sweep36/$b" 2>/dev/null | wc -l)
  if [ "$n" -lt 24 ]; then echo "$f" >> remain.txt; fi
done < uniq.txt
rm -f rchunk_*
split -l 3 -d remain.txt rchunk_
wc -l remain.txt
ls rchunk_*
