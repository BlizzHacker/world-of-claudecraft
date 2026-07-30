#!/usr/bin/env python3
"""Build the v0.32.0 resolution plan from the committed v0.30 rules + fresh triage.

Emits /tmp/rules-v032.txt for apply-rules.py, and prints what is left over.
"""
import io
import os
import re
import subprocess
import sys

REPO = '/opt/cr-v032'
RULEDIR = os.path.join(REPO, 'docs/cryptic-realm-recovery/v030')


def conflicted():
    out = subprocess.run(['git', '-C', REPO, 'diff', '--name-only', '--diff-filter=U'],
                         capture_output=True, text=True).stdout.split()
    return sorted(out)


def v030_rules():
    rules = {}
    for name in sorted(os.listdir(RULEDIR)):
        if not (name.startswith('rules-batch') and name.endswith('.txt')):
            continue
        for line in io.open(os.path.join(RULEDIR, name), encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split(None, 1)
            if len(parts) == 2:
                rules[parts[1].strip()] = parts[0].strip()
    return rules


# Files whose conflict is resolved by regeneration or a dedicated tool, never by
# a hunk rule. Ordering matters: generated artifacts can only be rebuilt once the
# source tree compiles, so these are the LAST step, not the first.
DEFERRED = (
    re.compile(r'^tests/parity/golden/'),
    re.compile(r'^src/ui/i18n\.resolved\.generated/'),
    re.compile(r'^src/admin/i18n\.resolved\.generated/'),
    re.compile(r'^src/ui/i18n\.catalog/translation_keys\.generated\.ts$'),
    re.compile(r'^src/ui/i18n\.resolved\.sha256$'),
    re.compile(r'^src/ui/i18n\.status'),
)
LOCALES = re.compile(r'^src/(ui|admin)/i18n\.locales/')


def classify(path):
    lines = io.open(os.path.join(REPO, path), encoding='utf-8', errors='replace').read().split('\n')
    ours = theirs = hunks = 0
    side = None
    for l in lines:
        if l.startswith('<<<<<<<'):
            side = 'o'
            hunks += 1
        elif l.startswith('======='):
            side = 't'
        elif l.startswith('>>>>>>>'):
            side = None
        elif side == 'o':
            ours += 1
        elif side == 't':
            theirs += 1
    if hunks == 0:
        return 'BINARY-OR-MODE', ours, theirs
    if theirs <= 2 and ours > theirs * 3:
        return 'FORK-ADD', ours, theirs
    if ours <= 2 and theirs > ours * 3:
        return 'UPSTREAM-ADD', ours, theirs
    return 'INTERLEAVED', ours, theirs


def main():
    conf = conflicted()
    rules = v030_rules()
    emit = []
    deferred, locales, leftover = [], [], []
    reused = 0

    for path in conf:
        if any(rx.search(path) for rx in DEFERRED):
            deferred.append(path)
            continue
        if LOCALES.search(path):
            locales.append(path)
            continue
        if path in rules:
            emit.append((rules[path], path))
            reused += 1
            continue
        kind, o, t = classify(path)
        if kind == 'UPSTREAM-ADD':
            emit.append(('theirs', path))
        elif kind == 'FORK-ADD':
            emit.append(('ours', path))
        else:
            leftover.append((path, kind, o, t))

    with io.open('/tmp/rules-v032.txt', 'w', encoding='utf-8', newline='') as f:
        f.write('# generated: v0.30 rules reused where the path conflicts again,\n')
        f.write('# plus fresh one-sided triage. Interleaved files are NOT here.\n')
        for rule, path in emit:
            f.write('%-16s %s\n' % (rule, path))

    print('conflicted            %d' % len(conf))
    print('  deferred/regenerate %d' % len(deferred))
    print('  locale overlays     %d' % len(locales))
    print('  auto-ruled          %d   (of which %d reuse a v0.30 decision)' % (len(emit), reused))
    print('  NEEDS JUDGMENT      %d' % len(leftover))
    print()
    print('--- judgment queue, biggest first ---')
    for path, kind, o, t in sorted(leftover, key=lambda r: -(r[2] + r[3]))[:40]:
        print('  %-58s %-12s ours=%-5d theirs=%d' % (path, kind, o, t))


if __name__ == '__main__':
    main()
