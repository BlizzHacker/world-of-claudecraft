#!/bin/bash
# Candidate sweep for the two cards that genuinely need a new body:
# Paladin (no override at all, compiled fallback is a barred body) and
# Blood Knight (its live hero GLB shreds in Attack and Walk).
# These are 22-clip library bodies, so Attack AND an emote are both covered.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome

while pgrep -f "phase_render1.mj[s]" >/dev/null; do sleep 10; done

echo "=== candidates $(date -Is)" > /tmp/sweepC.log
nice -n 15 node tmp_audit/phase_render1.mjs \
  --list tmp_audit/cands.txt --out /tmp/sweepC \
  --clips Idle,Walking_A,Running_A,1H_Melee_Attack_Chop,Spellcasting,Cheer \
  --phases 0,0.33,0.66 --yaws front,hero --size 384 >> /tmp/sweepC.log 2>&1
echo "=== done $(date -Is)" >> /tmp/sweepC.log
