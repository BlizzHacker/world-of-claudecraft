#!/bin/bash
Q=/mnt/usb4/moveweight-assets/cr-realms-quarantine
echo "=== ip-likeness ($(ls $Q/ip-likeness 2>/dev/null | wc -l))"
ls $Q/ip-likeness 2>/dev/null | head -30
echo
echo "=== ip-brand ($(ls $Q/ip-brand 2>/dev/null | wc -l))"
ls $Q/ip-brand 2>/dev/null | head -30
echo
echo "=== any README/manifest of the purge"
find $Q -maxdepth 2 -name '*.txt' -o -maxdepth 2 -name '*.md' -o -maxdepth 2 -name '*.json' 2>/dev/null | head
echo
echo "=== sweep progress"
ls /opt/cryptic-realm/tmp_audit/sweepout 2>/dev/null | wc -l
tail -3 /opt/cryptic-realm/tmp_audit/sweep_render.log 2>/dev/null
