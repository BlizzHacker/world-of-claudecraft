#!/bin/bash
# Retry loop: the container sits at load ~126 (a deploy plus another agent's
# renders), so puppeteer launches and evaluates time out at random. Each body
# gets its own browser and up to N attempts; already-complete bodies are skipped
# for free, so this script is safe to run again and again until the set is done.
cd /opt/cryptic-realm
export BROWSER_PATH=/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
ATTEMPTS=${1:-2}
bash /opt/cryptic-realm/tmp_audit/mkremain.sh > /dev/null 2>&1
for i in $(seq 1 "$ATTEMPTS"); do
  n=$(wc -l < /opt/cryptic-realm/tmp_audit/remain.txt)
  [ "$n" -eq 0 ] && break
  echo "--- attempt $i, $n left"
  node tmp_audit/phase_render1.mjs --list tmp_audit/remain.txt --out /tmp/sweep36 \
    --clips Idle,Walk,Attack --phases 0,0.25,0.5,0.75 --yaws front,hero --size 384 \
    2>/dev/null | grep -E '^OK|^FAIL|^SKIP'
  bash /opt/cryptic-realm/tmp_audit/mkremain.sh > /dev/null 2>&1
done
echo "still missing:"
cat /opt/cryptic-realm/tmp_audit/remain.txt
