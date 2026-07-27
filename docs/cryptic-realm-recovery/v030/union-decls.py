#!/usr/bin/env python3
"""Re-resolve declaration-heavy files as a UNION of both sides.

Interface/context/type files are additive on both sides: upstream adds fields for
its new features (deedRuntime, deedDirtyPids...) while the fork adds its own.
Picking a side silently drops one set, which shows up far away as
"Property X does not exist on type Y" in files that were never conflicted.

The merge is already committed, so MERGE_HEAD is gone; parents are addressed as
<merge>^1 (fork) and <merge>^2 (upstream).

Usage: union_decls.py <repo> <merge-sha> <file>...
"""
import io
import re
import subprocess
import sys

OPEN, CLOSE = set("{(["), set("})]")


def balanced(lines):
    d = t = 0
    for l in lines:
        s = re.sub(r"//.*$", "", l)
        for ch in s:
            if ch == "`":
                t += 1
            elif ch in OPEN:
                d += 1
            elif ch in CLOSE:
                d -= 1
    return d == 0 and t % 2 == 0


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True)


repo, merge = sys.argv[1].rstrip("/"), sys.argv[2]
base = sh("git", "-C", repo, "merge-base", merge + "^1", merge + "^2").stdout.strip()

for rel in sys.argv[3:]:
    ok = True
    for tag, rev in (("base", base), ("ours", merge + "^1"), ("theirs", merge + "^2")):
        r = sh("git", "-C", repo, "show", "%s:%s" % (rev, rel))
        if r.returncode != 0:
            print("  %-40s SKIP (absent in %s)" % (rel, tag)); ok = False; break
        io.open("/tmp/ud_" + tag, "w", encoding="utf-8", newline="\n").write(r.stdout)
    if not ok:
        continue
    merged = sh("git", "merge-file", "-p", "/tmp/ud_ours", "/tmp/ud_base", "/tmp/ud_theirs").stdout
    lines = merged.split("\n")
    out, i, stats = [], 0, {}
    while i < len(lines):
        if not lines[i].startswith("<<<<<<<"):
            out.append(lines[i]); i += 1; continue
        i += 1
        ours = []
        while i < len(lines) and not lines[i].startswith("======="):
            ours.append(lines[i]); i += 1
        i += 1
        theirs = []
        while i < len(lines) and not lines[i].startswith(">>>>>>>"):
            theirs.append(lines[i]); i += 1
        i += 1
        o = [l for l in ours if l.strip()]
        t = [l for l in theirs if l.strip()]
        if not t:
            rule = "ours"
        elif not o:
            rule = "theirs"
        elif balanced(ours) and balanced(theirs):
            rule = "union"
        else:
            rule = "theirs-unbal"
        stats[rule] = stats.get(rule, 0) + 1
        if rule == "ours":
            out.extend(ours)
        elif rule.startswith("theirs"):
            out.extend(theirs)
        else:
            out.extend(theirs); out.extend(ours)
    txt = "\n".join(out)
    io.open(repo + "/" + rel, "w", encoding="utf-8", newline="\n").write(txt)
    print("  %-40s %s left=%d" % (rel, " ".join("%s=%d" % kv for kv in sorted(stats.items())),
                                  txt.count("<<<<<<<")))
