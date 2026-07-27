#!/usr/bin/env python3
"""Fix TS1361: value symbols that landed inside an `import type { ... }`.

My import re-adder merged new symbols into whichever import from that module it
found first, reusing its `type` keyword. When that import was type-only, runtime
symbols became type-only too.

For each TS1361 symbol, drop the `type` keyword from the import statement that
declares it, so the whole statement becomes a value import. Types imported as
values are legal; the reverse is not.

Usage: fix_type_only_imports.py <repo> <tsc.log>
"""
import io
import os
import re
import sys
from collections import defaultdict

repo = sys.argv[1].rstrip("/")
log = sys.argv[2]

ERR = re.compile(r"^([^(]+)\(\d+,\d+\): error TS1361: '([^']+)' cannot be used as a value")
per_file = defaultdict(set)
for line in io.open(log, encoding="utf-8", errors="replace"):
    m = ERR.match(line.strip())
    if m:
        per_file[m.group(1)].add(m.group(2))

fixed = 0
for rel, syms in sorted(per_file.items()):
    path = os.path.join(repo, rel)
    if not os.path.isfile(path):
        continue
    src = io.open(path, encoding="utf-8").read()
    lines = src.split("\n")

    # collect import statements with their line spans
    i = 0
    changed = False
    while i < len(lines):
        if lines[i].startswith("import type "):
            start = i
            buf = lines[i]
            while buf.count("{") != buf.count("}") or not buf.rstrip().endswith(";"):
                i += 1
                if i >= len(lines):
                    break
                buf += "\n" + lines[i]
            if any(re.search(r"\b%s\b" % re.escape(s), buf) for s in syms):
                lines[start] = lines[start].replace("import type ", "import ", 1)
                changed = True
                fixed += 1
        i += 1

    if changed:
        io.open(path, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
        print("  %-44s made %d import(s) value-capable" % (rel, fixed))

print("\nconverted %d type-only import statement(s)" % fixed)
