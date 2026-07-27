#!/usr/bin/env python3
"""Audit: which fork content records did the merge silently drop?

Conflicted files got explicit decisions. Files git auto-merged did NOT - if
upstream rewrote a region the fork had added records to, those records can vanish
with no conflict and no warning. commanding_shout ("Bolstering Cry") was lost
exactly that way.

For every content-style file, compare the top-level record ids present in the fork
parent against the merged tree, and report ids the fork had that the merge lacks.
Read-only.

Usage: audit_fork_content.py <repo> <merge-sha>
"""
import io
import re
import subprocess
import sys

repo, merge = sys.argv[1].rstrip("/"), sys.argv[2]
ID = re.compile(r"^  ([a-z][a-z0-9_]*): \{\s*$", re.M)


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout


files = [f for f in sh("git", "-C", repo, "ls-tree", "-r", "--name-only",
                       merge + "^1").split("\n")
         if f.startswith(("src/sim/content/", "src/sim/instances/", "src/sim/realms/"))
         and f.endswith(".ts")]

total_lost = 0
rows = []
for rel in sorted(files):
    ours = sh("git", "-C", repo, "show", "%s^1:%s" % (merge, rel))
    if not ours:
        continue
    try:
        cur = io.open(repo + "/" + rel, encoding="utf-8").read()
    except OSError:
        rows.append((rel, ["<FILE MISSING FROM MERGE>"]))
        continue
    theirs = sh("git", "-C", repo, "show", "%s^2:%s" % (merge, rel))
    o, c, t = set(ID.findall(ours)), set(ID.findall(cur)), set(ID.findall(theirs))
    # fork-only ids (not upstream's) that the merge no longer has
    lost = sorted((o - t) - c)
    if lost:
        total_lost += len(lost)
        rows.append((rel, lost))

print("fork-only records missing from the merge: %d\n" % total_lost)
for rel, lost in rows:
    print("%s" % rel)
    for x in lost:
        print("    %s" % x)
