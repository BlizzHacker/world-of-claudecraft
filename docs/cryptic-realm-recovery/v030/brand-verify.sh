#!/usr/bin/env bash
# Re-brand upstream-new locale strings, then verify the overlays for real.
cd /opt/cr-measure
FAIL=0

echo "=== 1. branding sweep over merged overlays ==="
before=$(grep -h -o 'World of ClaudeCraft\|worldofclaudecraft\.com\|World of Claudecraft' src/ui/i18n.locales/*.ts | wc -l)
# Fork branding wins. These occurrences all arrive on upstream-new keys
# (wallet.browser.*, seo.*, desktop.*), so this only rewrites text we just gained.
sed -i \
  -e 's/World of ClaudeCraft/Cryptic Realm/g' \
  -e 's/World of Claudecraft/Cryptic Realm/g' \
  -e 's/worldofclaudecraft\.com/crypticrealm.com/g' \
  src/ui/i18n.locales/*.ts
after=$(grep -h -o 'World of ClaudeCraft\|worldofclaudecraft\.com\|World of Claudecraft' src/ui/i18n.locales/*.ts | wc -l)
echo "  upstream-brand strings: $before -> $after"
[ "$after" = 0 ] || FAIL=1

echo "=== 2. conflict markers ==="
n=$(grep -l '^<<<<<<<\|^>>>>>>>' src/ui/i18n.locales/*.ts 2>/dev/null | wc -l)
echo "  files with markers: $n"; [ "$n" = 0 ] || FAIL=1

echo "=== 3. real parse check via local esbuild ==="
EB=./node_modules/.bin/esbuild
if [ ! -x "$EB" ]; then echo "  esbuild missing"; FAIL=1; else
  bad=0
  for f in src/ui/i18n.locales/*.ts; do
    "$EB" --loader=ts --log-level=error "$f" > /dev/null 2>/tmp/eb_err.txt || { echo "  PARSE FAIL: $f"; head -3 /tmp/eb_err.txt; bad=$((bad+1)); }
  done
  echo "  parse failures: $bad"; [ "$bad" = 0 ] || FAIL=1
fi

echo "=== 4. duplicate keys inside any overlay ==="
python3 - <<'PY'
import glob,re,collections
K=re.compile(r"^\s*'((?:[^'\\]|\\.)+)'\s*:",re.M)
worst=0
for p in sorted(glob.glob('/opt/cr-measure/src/ui/i18n.locales/*.ts')):
    ks=K.findall(open(p,encoding='utf-8').read())
    d=[k for k,c in collections.Counter(ks).items() if c>1]
    if d:
        worst=max(worst,len(d))
        print("  %s: %d duplicate keys e.g. %s"%(p.split('/')[-1],len(d),d[:3]))
print("  max duplicates in any file: %d"%worst)
PY

echo
[ "$FAIL" = 0 ] && echo "VERIFY: PASS" || echo "VERIFY: FAIL"
