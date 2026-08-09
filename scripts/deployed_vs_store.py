#!/usr/bin/env python3
"""Does the DEPLOYED build reference assets the store no longer has?

check_dangling reads the working tree. The rings are pinned to a sha, so a
quarantine that lands after the build leaves the shipped manifest pointing at
files that were removed underneath it — invisible to a working-tree check, and
a 404 for every player.
"""
import re, os, subprocess, glob

STORE = '/opt/cr-realms-store'
rings = sorted(glob.glob('/opt/cr-stages/*/live/src/render/characters/manifest.generated.ts'))
print('checking', len(rings), 'live rings\n')

total_missing = 0
for path in rings:
    realm = path.split('/')[3]
    try:
        src = open(path, encoding='utf-8').read()
    except Exception as e:
        print(realm, 'unreadable:', e)
        continue
    urls = sorted(set(re.findall(r'\$\{REALM_MODELS\}/([^`\'"]+\.glb)', src)))
    missing = [u for u in urls if not os.path.exists(os.path.join(STORE, u))]
    total_missing += len(missing)
    print(f'{realm:<14} deployed refs {len(urls):>5}   missing from store now: {len(missing)}')
    for m in missing[:8]:
        print('     ', m)

print(f'\nTOTAL deployed refs missing from the store: {total_missing}')
sha = subprocess.run(['git', '-C', '/opt/cr-stages/infernal/live', 'rev-parse', '--short', 'HEAD'],
                     capture_output=True, text=True).stdout.strip()
head = subprocess.run(['git', '-C', '/opt/cryptic-realm', 'rev-parse', '--short', 'HEAD'],
                      capture_output=True, text=True).stdout.strip()
print(f'deployed sha {sha}   repo HEAD {head}')
