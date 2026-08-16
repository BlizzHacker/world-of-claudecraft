#!/bin/bash
# emit_manifest reads STAGING, not the store. A purge that only empties the store
# is undone by the next regeneration - which is exactly what happened between the
# HEAD quarantine commit and the tree I inherited (26 purged bodies were back).
# Check whether the bodies quarantined in this pass are still sitting in staging.
STAGING=/mnt/usb4/moveweight-assets/cr-realms-staging
Q=/mnt/usb4/moveweight-assets/cr-realms-quarantine
cd /opt/cryptic-realm || exit 1
echo "staging present: $([ -d $STAGING ] && echo yes || echo NO)"
[ -d $STAGING ] || exit 0
n=0; back=0
for f in $(find $Q/ip-likeness $Q/ip-brand -name '*.glb' 2>/dev/null); do
  k=$(basename "$f" .glb)
  n=$((n+1))
  hit=$(find $STAGING -name "$k.glb" 2>/dev/null | head -1)
  if [ -n "$hit" ]; then
    back=$((back+1))
    echo "  STILL IN STAGING: $k"
  fi
done
echo "quarantined files: $n   still re-registerable from staging: $back"
