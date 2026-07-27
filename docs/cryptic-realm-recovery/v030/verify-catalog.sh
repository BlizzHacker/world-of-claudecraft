#!/usr/bin/env bash
cd /opt/cr-measure
FAIL=0
echo "=== 1. markers ==="
n=$(grep -l '^<<<<<<<\|^>>>>>>>' src/ui/i18n.catalog/*.ts 2>/dev/null | wc -l)
echo "  files with markers: $n"; [ "$n" = 0 ] || FAIL=1

echo "=== 2. parse ==="
bad=0
for f in src/ui/i18n.catalog/*.ts; do
  ./node_modules/.bin/esbuild "$f" --log-level=error >/dev/null 2>/tmp/ce.txt || { echo "  FAIL $f"; head -5 /tmp/ce.txt; bad=$((bad+1)); }
done
echo "  parse failures: $bad"; [ "$bad" = 0 ] || FAIL=1

echo "=== 3. upstream comments preserved ==="
for f in hud_chrome guide shell index; do
  c=$(grep -cE '^\s*//' src/ui/i18n.catalog/$f.ts)
  echo "  $f.ts comments: $c"
done

echo "=== 4. fork content present ==="
for pat in '\$CR' 'Cryptic Realm' 'venues:' 'coop:' 'contributions:' 'arcade:'; do
  c=$(grep -rh "$pat" src/ui/i18n.catalog/*.ts | wc -l)
  echo "  '$pat': $c"
done
echo "  WOC leftovers: $(grep -rhE '\\\$?WOC\b' src/ui/i18n.catalog/*.ts | wc -l)"

echo "=== 5. upstream-new keys still present ==="
python3 - <<'PY'
import sys, subprocess
sys.path.insert(0,'/tmp')
from catalog_lib import parse, stage
for rel in ['src/ui/i18n.catalog/guide.ts','src/ui/i18n.catalog/hud_chrome.ts',
            'src/ui/i18n.catalog/index.ts','src/ui/i18n.catalog/shell.ts']:
    merged=open('/opt/cr-measure/'+rel,encoding='utf-8').read()
    _,ml,_=parse(merged)
    _,ol,_=parse(stage('/opt/cr-measure',2,rel))
    _,tl,_=parse(stage('/opt/cr-measure',3,rel))
    missing_up=set(tl)-set(ml); missing_ours=set(ol)-set(ml)
    print("  %-16s merged=%d  upstream-dropped=%d  ours-dropped=%d"%(
        rel.split('/')[-1],len(ml),len(missing_up),len(missing_ours)))
    for p in list(missing_up)[:3]: print("      lost upstream:", ".".join(p))
    for p in list(missing_ours)[:3]: print("      lost ours:", ".".join(p))
PY

echo
[ "$FAIL" = 0 ] && echo "VERIFY: PASS" || echo "VERIFY: FAIL"
