#!/bin/bash
cd /opt/cryptic-realm || exit 1
echo "=== realm_assets scripts"
ls scripts/realm_assets/
echo
echo "=== is there an existing IP purge list / quarantine dir"
ls -d /mnt/usb4/moveweight-assets/cr-realms-quarantine 2>/dev/null && ls /mnt/usb4/moveweight-assets/cr-realms-quarantine
grep -rln 'batman\|darth\|space_marine\|he_man\|grinch' scripts/ config/ 2>/dev/null | head
echo
echo "=== today's audit dir"
ls /opt/cr-realms-store/review/body_audit_2026_08_08 2>/dev/null | head -20
echo
echo "=== emit_manifest inputs"
head -40 scripts/realm_assets/emit_manifest.mjs 2>/dev/null
