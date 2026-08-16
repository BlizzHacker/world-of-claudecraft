#!/bin/bash
# Wait for the in-flight phase sweep to exit, retry any batch-A body that
# failed (the runner skips ones that already have their frames), then run
# batch B: the queued Priority-2 renders plus their controls.
cd /opt/cryptic-realm || exit 1
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome

while pgrep -f "phase_render1.mj[s]" >/dev/null; do sleep 10; done

echo "=== batch A retry $(date -Is)"
nice -n 15 node tmp_audit/phase_render1.mjs \
  --list tmp_audit/batchA.txt --out /tmp/sweepA \
  --clips Idle,Walk,Run,Attack --phases 0,0.25,0.5,0.75 \
  --yaws front,hero --size 384 >> /tmp/sweepA.log 2>&1

echo "=== batch B $(date -Is)" > /tmp/sweepB.log
# Class/civilian bank: 10 clips, so Wave and Taunt give the mandatory emote.
nice -n 15 node tmp_audit/phase_render1.mjs \
  --list tmp_audit/batchB.txt --out /tmp/sweepB \
  --clips Idle,Walk,Attack,Wave,Taunt --phases 0,0.25,0.5,0.75 \
  --yaws front,hero --size 384 >> /tmp/sweepB.log 2>&1

echo "=== all done $(date -Is)" >> /tmp/sweepB.log
