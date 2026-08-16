#!/bin/bash
# Purge the confirmed-IP keys, then REGENERATE the roster rather than hand-editing
# it. rosters.generated.ts picks bodies out of the manifest pools, so cleaning the
# pools and re-running the generator is what makes the roster consistent again -
# and it also repairs the 10 entries still pointing at keys the LAST purge removed
# without regenerating.
set -e
cd /opt/cryptic-realm

LIKENESS_FILE=tmp_audit/purge_likeness.txt
BRAND_FILE=tmp_audit/purge_brand.txt

echo "=== BEFORE"
echo "  roster entries broken: $(node tmp_audit/roster_check.mjs 2>/dev/null | head -1)"

if [ -s "$LIKENESS_FILE" ]; then
  echo "=== purge ip-likeness ($(wc -l < $LIKENESS_FILE))"
  node scripts/ip_purge.mjs --bucket ip-likeness $(tr '\n' ' ' < "$LIKENESS_FILE")
fi
if [ -s "$BRAND_FILE" ]; then
  echo "=== purge ip-brand ($(wc -l < $BRAND_FILE))"
  node scripts/ip_purge.mjs --bucket ip-brand $(tr '\n' ' ' < "$BRAND_FILE")
fi

echo "=== regenerate rosters"
node scripts/realm_assets/gen_rosters.mjs

echo "=== AFTER"
node tmp_audit/roster_check.mjs 2>/dev/null | head -1
echo "--- dangling"
node scripts/check_dangling.mjs 2>&1 | tail -1
echo "--- typecheck errors (baseline 79)"
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS" || true
