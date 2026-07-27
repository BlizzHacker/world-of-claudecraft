#!/bin/bash
# Publish rigged bodies from staging into the live realm store.
#
# GLBs never travel with code: public/cr-realms/ is gitignored and the client
# loads /cr-realms/... from CR_REALMS_DIR. Shipping code without this step is the
# classic failure where a deploy "looks undone".
set -u
STAGE=/mnt/usb4/moveweight-assets/cr-realms-staging
STORE=/mnt/usb4/moveweight-assets/cr-realms

echo "=== store BEFORE ==="
for d in "$STORE"/*/; do
  [ -d "$d" ] || continue
  printf '  %-14s %s\n' "$(basename "$d")" "$(ls "$d" 2>/dev/null | wc -l)"
done

echo "=== publishing ==="
for s in "$STAGE"/*/; do
  [ -d "$s" ] || continue
  r=$(basename "$s")
  d="$STORE/$r"
  mkdir -p "$d"
  n=$(ls "$s"/*.glb 2>/dev/null | wc -l)
  [ "$n" -eq 0 ] && continue
  # -n: never clobber a curated/hand-placed body already in the store.
  cp -n "$s"/*.glb "$d"/ 2>/dev/null
  chmod 644 "$d"/*.glb 2>/dev/null
  printf '  %-14s +%s staged -> %s total\n' "$r" "$n" "$(ls "$d"/*.glb 2>/dev/null | wc -l)"
done

echo "=== store AFTER ==="
for d in "$STORE"/*/; do
  [ -d "$d" ] || continue
  printf '  %-14s %s\n' "$(basename "$d")" "$(ls "$d" 2>/dev/null | wc -l)"
done
echo "=== disk ==="
df -h / | tail -1
du -sh "$STORE" 2>/dev/null
