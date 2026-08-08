#!/usr/bin/env python3
"""Which shipped bodies can the game never hand out?

The manifest is generated from the STAGING mirror, but the files are SERVED from
the store. A body sitting in the store with no staging counterpart is never
registered — it is downloadable and completely unreachable in play. Some of
those are legitimate: manifest.ts is hand-authored and names ~124 bodies
directly, and the live override map can point a class or NPC at any URL. So a
file only counts as orphaned once nothing in the source tree, and nothing in the
published override map, mentions it.
"""
import os, glob, subprocess, json, urllib.request

STORE = '/opt/cr-realms-store'
STAGE = '/mnt/usb4/moveweight-assets/cr-realms-staging'
REPO = '/opt/cryptic-realm'

candidates = []
for realm in sorted(os.listdir(STORE)):
    d = os.path.join(STORE, realm)
    if not os.path.isdir(d) or realm == 'review':
        continue
    for p in sorted(glob.glob(os.path.join(d, '*.glb'))):
        if not os.path.exists(os.path.join(STAGE, realm, os.path.basename(p))):
            candidates.append((realm, os.path.basename(p)[:-4]))
print('served but unregistered:', len(candidates))

# One grep over the source tree for every candidate stem at once.
referenced = set()
src_blob = ''
for root, _dirs, files in os.walk(os.path.join(REPO, 'src')):
    for f in files:
        if f.endswith(('.ts', '.tsx', '.json')):
            try:
                src_blob += open(os.path.join(root, f), encoding='utf-8', errors='ignore').read()
            except Exception:
                pass
print('source bytes scanned:', len(src_blob))

# Published override rows can also make a body reachable with no code reference.
override_urls = set()
try:
    tok = open(os.path.join(REPO, 'tmp/cr_debug_token')).read().strip()
    for realm in ('infernal', 'classic', 'crypticrealm'):
        req = urllib.request.Request(
            f'https://{realm}.crypticrealm.com/api/realm-visuals/{realm}',
            headers={'Authorization': f'Bearer {tok}'})
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.load(r)
        for v in (d.get('overrides') or {}).values():
            if isinstance(v, dict) and v.get('assetUrl'):
                override_urls.add(v['assetUrl'])
except Exception as e:
    print('override map unavailable:', e)
print('published override urls:', len(override_urls))

orphans, reachable = [], 0
for realm, stem in candidates:
    if stem in src_blob or any(stem in u for u in override_urls):
        reachable += 1
    else:
        orphans.append(f'{realm}/{stem}')

print(f'\nreachable after all (hand-authored or overridden): {reachable}')
print(f'TRULY UNREACHABLE: {len(orphans)}')
per = {}
for o in orphans:
    per[o.split('/')[0]] = per.get(o.split('/')[0], 0) + 1
for k, v in sorted(per.items(), key=lambda kv: -kv[1]):
    print(f'   {k}: {v}')
json.dump(orphans, open('/opt/cryptic-realm/tmp/orphan_bodies.json', 'w'), indent=1)
print('\nwrote /opt/cryptic-realm/tmp/orphan_bodies.json')
for o in orphans[:20]:
    print('  ', o)
