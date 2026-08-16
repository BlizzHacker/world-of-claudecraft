#!/bin/bash
# Emit the GLB path of every roster entry whose visualKey actually resolves, so
# the sweep renders exactly what a player can select today.
set -e
cd /opt/cryptic-realm
node tmp_audit/roster_check.mjs 2>/dev/null \
  | sed -n '/---OKLIST---/,$p' \
  | tail -n +2 \
  | cut -f6 \
  | sort -u > tmp_audit/roster_bodies.txt
echo "roster bodies: $(wc -l < tmp_audit/roster_bodies.txt)"
head -3 tmp_audit/roster_bodies.txt
