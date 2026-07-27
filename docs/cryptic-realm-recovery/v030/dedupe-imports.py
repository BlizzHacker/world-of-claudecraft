#!/usr/bin/env python3
"""Fold duplicate same-module imports created by per-hunk import merging.

Only touches top-level import statements OUTSIDE conflict regions; anything
between <<<<<<< and >>>>>>> is copied verbatim, so unresolved hunks are safe.
The first occurrence of a module keeps its position and absorbs the specifiers
of the later ones; side-effect imports (`import './x';`) are left alone.
"""
import io
import re
import sys

IMP = re.compile(
    r"^import\s+(?:(?P<t>type)\s+)?\{(?P<named>[^}]*)\}\s*from\s*['\"](?P<mod>[^'\"]+)['\"];\s*$"
)


def fold(path):
    lines = io.open(path, encoding="utf-8").read().split("\n")
    in_conf = False
    # first pass: collect specifiers per module for foldable single-line imports
    occ = {}
    for i, l in enumerate(lines):
        if l.startswith("<<<<<<<"):
            in_conf = True
        elif l.startswith(">>>>>>>"):
            in_conf = False
            continue
        if in_conf:
            continue
        m = IMP.match(l)
        if m:
            occ.setdefault(m.group("mod"), []).append(i)

    dups = {m: idxs for m, idxs in occ.items() if len(idxs) > 1}
    if not dups:
        return 0, 0

    drop = set()
    for mod, idxs in dups.items():
        names = {}
        all_type = True
        for i in idxs:
            m = IMP.match(lines[i])
            if not m.group("t"):
                all_type = False
            for part in m.group("named").split(","):
                p = " ".join(part.split())
                if not p:
                    continue
                bare = p[5:].strip() if p.startswith("type ") else p
                is_t = p.startswith("type ") or bool(m.group("t"))
                names[bare] = (names.get(bare, True) and is_t)
        specs = []
        for bare in sorted(names, key=str.lower):
            specs.append(("type " + bare) if (names[bare] and not all_type) else bare)
        prefix = "import type " if all_type else "import "
        line = "%s{ %s } from '%s';" % (prefix, ", ".join(specs), mod)
        if len(line) > 100:
            block = [prefix + "{"] + ["  %s," % s for s in specs] + ["} from '%s';" % mod]
        else:
            block = [line]
        keep = idxs[0]
        lines[keep] = "\n".join(block)
        for i in idxs[1:]:
            drop.add(i)

    out = [l for i, l in enumerate(lines) if i not in drop]
    io.open(path, "w", encoding="utf-8", newline="\n").write("\n".join(out))
    return len(dups), len(drop)


for p in sys.argv[2:]:
    full = sys.argv[1].rstrip("/") + "/" + p
    try:
        mods, removed = fold(full)
    except Exception as e:  # noqa: BLE001
        print("  ERROR %-42s %s" % (p, e))
        continue
    if mods:
        print("  %-42s folded %d module(s), removed %d line(s)" % (p, mods, removed))
