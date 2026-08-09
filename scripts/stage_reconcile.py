#!/usr/bin/env python3
"""Reconcile the staging mirror with the served store.

emit_manifest enumerates the STAGING mirror to decide what exists, but the URL it
writes points at the STORE. Quarantine passes have been removing files from the
store only, so every one of them came straight back into the registry pointing at
a file that is no longer served — a body that renders as nothing and logs nothing.
That is how a Chun-Li and a Darkseid stayed in the manifest after being pulled.

Any top-level staging GLB with no counterpart in the store is therefore either
quarantined or lost. Move it out of staging so the registry stops resurrecting it.
"""
import os, glob, shutil, sys

STORE = '/opt/cr-realms-store'
STAGE = '/mnt/usb4/moveweight-assets/cr-realms-staging'
DEST = '/mnt/usb4/moveweight-assets/cr-realms-quarantine/staging-orphans'
apply = '--apply' in sys.argv

realms = [d for d in os.listdir(STAGE) if os.path.isdir(os.path.join(STAGE, d)) and not d.startswith('_')]
orphans = []
for realm in sorted(realms):
    for path in sorted(glob.glob(os.path.join(STAGE, realm, '*.glb'))):
        name = os.path.basename(path)
        if not os.path.exists(os.path.join(STORE, realm, name)):
            orphans.append((realm, path))

print(f'staging realms: {len(realms)}')
print(f'top-level staging GLBs with no served store file: {len(orphans)}')
for realm, p in orphans[:60]:
    print(f'  {realm}/{os.path.basename(p)}')

if apply and orphans:
    moved = 0
    for realm, p in orphans:
        out = os.path.join(DEST, realm)
        os.makedirs(out, exist_ok=True)
        for f in glob.glob(p[:-4] + '.*'):
            dest = os.path.join(out, os.path.basename(f))
            if os.path.exists(dest):
                os.remove(f)
            else:
                shutil.move(f, dest)
            moved += 1
    print(f'\nmoved {moved} files to {DEST}')
elif orphans:
    print('\n(dry run — pass --apply to move them)')
