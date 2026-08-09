#!/usr/bin/env python3
"""Classify each remaining conflicted file by how much each side contributes.

  FORK-ADD      upstream contributes ~nothing -> keeping ours is safe
  UPSTREAM-ADD  we contribute ~nothing        -> taking theirs is safe
  INTERLEAVED   both sides substantial        -> needs real review
"""
import subprocess

REPO = "/opt/cr-measure"
files = subprocess.run(["git", "-C", REPO, "diff", "--name-only", "--diff-filter=U"],
                       capture_output=True, text=True).stdout.split()

rows = []
for f in files:
    try:
        lines = open(REPO + "/" + f, encoding="utf-8", errors="replace").read().split("\n")
    except IsADirectoryError:
        continue
    o = t = h = 0
    side = None
    for l in lines:
        if l.startswith("<<<<<<<"):
            side = "o"; h += 1
        elif l.startswith("======="):
            side = "t"
        elif l.startswith(">>>>>>>"):
            side = None
        elif side == "o":
            o += 1
        elif side == "t":
            t += 1
    if t <= 2 and o > t:
        cls = "FORK-ADD"
    elif o <= 2 and t > o:
        cls = "UPSTREAM-ADD"
    else:
        cls = "INTERLEAVED"
    rows.append((cls, h, o, t, f))

order = {"FORK-ADD": 0, "UPSTREAM-ADD": 1, "INTERLEAVED": 2}
rows.sort(key=lambda r: (order[r[0]], -(r[2] + r[3])))
cur = None
counts = {}
for cls, h, o, t, f in rows:
    if cls != cur:
        print("\n########## %s ##########" % cls)
        cur = cls
    counts[cls] = counts.get(cls, 0) + 1
    print("  %-46s hunks=%-3d ours=%-5d theirs=%-5d" % (f, h, o, t))
print("\nTOTAL %d  ->  %s" % (len(rows), counts))
