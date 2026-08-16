#!/bin/bash
# HEAD is "regenerate the registry after the franchise-body quarantine" with 1600
# entries; the tree I inherited had 1626. Something re-registered 26 bodies after
# that quarantine commit - exactly the trap quarantine_staging.mjs warns about
# (the purge removed them from the STORE, not from STAGING, so a later emit
# re-adds them). Check whether any re-added key is a body an earlier pass had
# already quarantined.
cd /opt/cryptic-realm || exit 1
git show HEAD:src/render/characters/manifest.generated.ts | grep -oE '^  realm_[a-z0-9_]+: \{' | sed 's/^  //; s/: {$//' | sort > /tmp/head_keys.txt
grep -oE '^  realm_[a-z0-9_]+: \{' src/render/characters/manifest.generated.ts | sed 's/^  //; s/: {$//' | sort > /tmp/now_keys.txt
echo "=== keys present NOW but not in HEAD (re-registered since the last quarantine commit):"
comm -13 /tmp/head_keys.txt /tmp/now_keys.txt | tee /tmp/added.txt | head -40
echo "count: $(wc -l < /tmp/added.txt)"
echo
echo "=== of those, any whose file sits in a quarantine bucket?"
Q=/mnt/usb4/moveweight-assets/cr-realms-quarantine
while read -r k; do
  [ -z "$k" ] && continue
  hit=$(find $Q -name "$k.glb" 2>/dev/null | head -1)
  [ -n "$hit" ] && echo "  RE-REGISTERED QUARANTINED BODY: $k -> $hit"
done < /tmp/added.txt
echo "  (no output above = none)"
