#!/usr/bin/env python3
"""Restore fork modules that upstream deleted but fork code still imports.

Upstream removed several src/ui modules (the PR #1736 revert and the hud/ reshuffle).
Because the fork had not modified them, git deleted them with no conflict - yet the
fork's own options_window.ts / hud.ts still import them. Restoring them from HEAD
keeps the fork's options subsystem working without re-porting it onto upstream's
rewritten window.

Runs transitively: a restored module may itself import other deleted modules.
"""
import io
import os
import re
import subprocess
import sys

REPO = "/opt/cr-measure"
OURS = sys.argv[1] if len(sys.argv) > 1 else "HEAD^1"  # fork side of the merge
EXTS = (".ts", ".tsx")
IMP = re.compile(r"from\s*'(\.[^']+)'", re.M)


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True)


def resolves(base, mod):
    p = os.path.normpath(os.path.join(base, mod))
    for e in EXTS + (".d.ts", ".js", ".json"):
        if os.path.isfile(p + e):
            return True
    if os.path.isdir(p):
        for e in EXTS:
            if os.path.isfile(os.path.join(p, "index" + e)):
                return True
    return False


def in_head(rel):
    return sh("git", "-C", REPO, "cat-file", "-e", OURS + ":" + rel).returncode == 0


def restore(rel):
    r = sh("git", "-C", REPO, "show", OURS + ":" + rel)
    if r.returncode != 0:
        return False
    dst = os.path.join(REPO, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    io.open(dst, "w", encoding="utf-8", newline="\n").write(r.stdout)
    return True


# seed: every relative import in the tree that does not resolve
queue = []
for root in ("src", "server"):
    for dirpath, _, files in os.walk(os.path.join(REPO, root)):
        if "node_modules" in dirpath:
            continue
        for f in files:
            if not f.endswith(".ts") or f.endswith(".d.ts"):
                continue
            p = os.path.join(dirpath, f)
            src = io.open(p, encoding="utf-8", errors="replace").read()
            for mod in IMP.findall(src):
                if not resolves(os.path.dirname(p), mod):
                    cand = os.path.relpath(
                        os.path.normpath(os.path.join(os.path.dirname(p), mod)), REPO
                    ).replace("\\", "/")
                    queue.append((cand, os.path.relpath(p, REPO).replace("\\", "/")))

restored, unresolved = [], []
seen = set()
while queue:
    cand, importer = queue.pop(0)
    if cand in seen:
        continue
    seen.add(cand)
    done = False
    for e in EXTS:
        if in_head(cand + e):
            if restore(cand + e):
                restored.append(cand + e)
                # follow its own imports
                p = os.path.join(REPO, cand + e)
                src = io.open(p, encoding="utf-8", errors="replace").read()
                for mod in IMP.findall(src):
                    if not resolves(os.path.dirname(p), mod):
                        nxt = os.path.relpath(
                            os.path.normpath(os.path.join(os.path.dirname(p), mod)), REPO
                        ).replace("\\", "/")
                        queue.append((nxt, cand + e))
                done = True
                break
    if not done:
        unresolved.append((cand, importer))

print("restored %d fork module(s) upstream had deleted:" % len(restored))
for r in sorted(restored):
    print("   " + r)
if unresolved:
    print("\nstill unresolved (%d) - not present in HEAD either:" % len(unresolved))
    for c, imp in unresolved[:20]:
        print("   %s  (imported by %s)" % (c, imp))
