#!/usr/bin/env python3
"""Move complete import statements that were inserted INSIDE a multi-line import.

The naive inserter appended after the last line starting with "import ", which can
be the opening line of a multi-line block:

    import {
    import { X } from './x';     <- lands here, breaking both
      typeA,
    } from './y';

Any full single-line import found between a block's opening `import {` and its
`} from '...';` is lifted out and re-emitted after the block closes.

Usage: unmisplace_imports.py <repo> <file>...
"""
import io
import re
import sys

FULL = re.compile(r"^import\s.*\sfrom\s*'[^']+';\s*$")

for rel in sys.argv[2:]:
    path = sys.argv[1].rstrip("/") + "/" + rel
    lines = io.open(path, encoding="utf-8").read().split("\n")
    out, moved = [], 0
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.rstrip() == "import {" or (line.startswith("import ") and "{" in line
                                           and "}" not in line):
            block, strays = [line], []
            i += 1
            while i < len(lines):
                cur = lines[i]
                if FULL.match(cur):
                    strays.append(cur); moved += 1; i += 1; continue
                block.append(cur)
                if cur.startswith("} from"):
                    break
                i += 1
            out.extend(block)
            out.extend(strays)
            i += 1
            continue
        out.append(line)
        i += 1
    if moved:
        io.open(path, "w", encoding="utf-8", newline="\n").write("\n".join(out))
    print("  %-40s moved %d misplaced import(s)" % (rel, moved))
