#!/usr/bin/env python3
"""Resolve package.json by hand: three hunks, three different calls."""
import io
import json
import sys

P = '/opt/cr-v032/package.json'
s = io.open(P, encoding='utf-8').read()


def swap(old, new):
    global s
    if s.count(old) != 1:
        sys.exit('anchor missed (%d):\n%s' % (s.count(old), old[:300]))
    s = s.replace(old, new, 1)


# 1. identity stays the fork's; version follows the <upstream>-cr.N convention,
#    so catching up to v0.32.0 resets the fork counter to 1.
swap("""<<<<<<< HEAD
  "name": "cryptic-realm",
  "version": "0.24.0-cr.1",
=======
  "name": "world-of-claudecraft",
  "version": "0.32.0",
>>>>>>> v0.32.0""",
     """  "name": "cryptic-realm",
  "version": "0.32.0-cr.1",""")

# 2. the build script needs BOTH sides: upstream added sfx:manifest, the fork
#    added the realm asset pass. Dropping either breaks a build.
swap("""<<<<<<< HEAD
    "build": "npm run i18n:build && npm run i18n:admin && npm run i18n:scan && npm run wiki:content && npm run sitemap:build && npm run assets:realms -- --skip-api && node scripts/build_media_manifest.mjs generate && vite build && node scripts/check_backdrop_survival.mjs && node scripts/build_media_manifest.mjs emit",
    "assets:realms": "node scripts/build_realm_assets.mjs",
    "assets:infernal-rigs": "node scripts/build_infernal_human_rigs.mjs",
    "assets:infernal-waypoint": "node scripts/build_infernal_waypoint.mjs",
=======
    "build": "npm run i18n:build && npm run i18n:admin && npm run i18n:scan && npm run wiki:content && npm run sitemap:build && npm run sfx:manifest && node scripts/build_media_manifest.mjs generate && vite build && node scripts/check_backdrop_survival.mjs && node scripts/build_media_manifest.mjs emit",
>>>>>>> v0.32.0""",
     """    "build": "npm run i18n:build && npm run i18n:admin && npm run i18n:scan && npm run wiki:content && npm run sitemap:build && npm run sfx:manifest && npm run assets:realms -- --skip-api && node scripts/build_media_manifest.mjs generate && vite build && node scripts/check_backdrop_survival.mjs && node scripts/build_media_manifest.mjs emit",
    "assets:realms": "node scripts/build_realm_assets.mjs",
    "assets:infernal-rigs": "node scripts/build_infernal_human_rigs.mjs",
    "assets:infernal-waypoint": "node scripts/build_infernal_waypoint.mjs",""")

# 3. keep the fork-only dep, take upstream's newer pins and its new one.
swap("""<<<<<<< HEAD
    "@vitejs/plugin-react": "^6.0.3",
    "@vitest/browser": "4.1.8",
    "@vitest/browser-playwright": "4.1.8",
=======
    "@typescript/native": "npm:typescript@^7.0.2",
    "@vitest/browser": "4.1.10",
    "@vitest/browser-playwright": "4.1.10",
>>>>>>> v0.32.0""",
     """    "@typescript/native": "npm:typescript@^7.0.2",
    "@vitejs/plugin-react": "^6.0.3",
    "@vitest/browser": "4.1.10",
    "@vitest/browser-playwright": "4.1.10",""")

if '<<<<<<<' in s or '>>>>>>>' in s:
    sys.exit('markers remain')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
pkg = json.loads(s)
print('resolved. name=%s version=%s' % (pkg['name'], pkg['version']))
print('build has sfx:manifest = %s' % ('sfx:manifest' in pkg['scripts']['build']))
print('build has assets:realms = %s' % ('assets:realms' in pkg['scripts']['build']))
print('assets scripts kept = %d' % len([k for k in pkg['scripts'] if k.startswith('assets:')]))
