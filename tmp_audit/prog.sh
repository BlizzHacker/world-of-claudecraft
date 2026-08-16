#!/bin/bash
echo "sweep dirs: $(ls /opt/cryptic-realm/tmp_audit/sweepout 2>/dev/null | wc -l) / 127"
grep -c '^OK' /opt/cryptic-realm/tmp_audit/sweep_render.log 2>/dev/null
echo "FAILs:"; grep '^FAIL' /opt/cryptic-realm/tmp_audit/sweep_render.log 2>/dev/null | head
echo
echo "=== quarantine dir writable?"
Q=/mnt/usb4/moveweight-assets/cr-realms-quarantine
touch $Q/ip-likeness/.wtest 2>&1 && echo "WRITABLE" && rm -f $Q/ip-likeness/.wtest || echo "NOT WRITABLE"
echo
echo "=== pool sizes in manifest"
cd /opt/cryptic-realm && node -e '
const s=require("fs").readFileSync("src/render/characters/manifest.generated.ts","utf8");
const b=s.slice(s.indexOf("GENERATED_REALM_BODIES"));
for(const m of b.matchAll(/^ {2}([a-z0-9]+): \[([^\]]*)\]/gms)){
  console.log(m[1], [...m[2].matchAll(/'"'"'([^'"'"']+)'"'"'/g)].length);
}'
