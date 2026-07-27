#!/usr/bin/env python3
"""Summarize each conflict hunk in a file: sizes plus a peek at both sides."""
import sys

path = sys.argv[1]
peek = int(sys.argv[2]) if len(sys.argv) > 2 else 6
lines = open(path, encoding="utf-8", errors="replace").read().split("\n")

i = 0
h = 0
while i < len(lines):
    if lines[i].startswith("<<<<<<<"):
        h += 1
        start = i
        ours, theirs = [], []
        i += 1
        while i < len(lines) and not lines[i].startswith("======="):
            ours.append(lines[i]); i += 1
        i += 1
        while i < len(lines) and not lines[i].startswith(">>>>>>>"):
            theirs.append(lines[i]); i += 1
        print("=" * 76)
        print("HUNK %d  at line %d   ours=%d lines  theirs=%d lines" % (h, start + 1, len(ours), len(theirs)))
        print("--- OURS (first %d) ---" % peek)
        for l in ours[:peek]:
            print("  " + l[:110])
        if len(ours) > peek:
            print("  ... (+%d)" % (len(ours) - peek))
            for l in ours[-2:]:
                print("  " + l[:110])
        print("--- THEIRS (first %d) ---" % peek)
        for l in theirs[:peek]:
            print("  " + l[:110])
        if len(theirs) > peek:
            print("  ... (+%d)" % (len(theirs) - peek))
            for l in theirs[-2:]:
                print("  " + l[:110])
    i += 1
print("=" * 76)
print("total hunks: %d" % h)
