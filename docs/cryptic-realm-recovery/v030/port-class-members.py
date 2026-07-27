#!/usr/bin/env python3
"""Port class members that a side-picked hunk dropped.

tsc reports "Property 'X' does not exist on type 'C'". The declaration exists in
one of the merge parents; extract it (a field line, or a whole method block) and
insert it into the class body of the merged file.

Fields are inserted right after the class opening brace. Methods are inserted
before the class's closing brace. Anything found in NEITHER parent is reported.

Usage: port_class_members.py <repo> <merge-sha> <tsc.log> <file> <ClassName>
"""
import io
import re
import subprocess
import sys

repo, merge, log, rel, cls = sys.argv[1].rstrip("/"), sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True)


ERR = re.compile(r"Property '([A-Za-z_$][\w$]*)' does not exist on type '" + re.escape(cls))
missing = []
for line in io.open(log, encoding="utf-8", errors="replace"):
    if not line.startswith(rel):
        continue
    m = ERR.search(line)
    if m and m.group(1) not in missing:
        missing.append(m.group(1))

parents = {}
for tag, rev in (("ours", merge + "^1"), ("theirs", merge + "^2")):
    parents[tag] = sh("git", "-C", repo, "show", "%s:%s" % (rev, rel)).stdout.split("\n")

cur = io.open(repo + "/" + rel, encoding="utf-8").read().split("\n")


def class_span(lines):
    start = None
    for i, l in enumerate(lines):
        if re.match(r"^\s*(export\s+)?(abstract\s+)?class\s+" + re.escape(cls) + r"\b", l):
            start = i
            break
    if start is None:
        return None, None
    depth = 0
    for i in range(start, len(lines)):
        depth += lines[i].count("{") - lines[i].count("}")
        if depth == 0 and i > start:
            return start, i
    return start, None


def extract(lines, name):
    """Return (kind, block) for a member declaration of `name` inside the class."""
    s, e = class_span(lines)
    if s is None:
        return None, None
    decl = re.compile(
        r"^(\s+)(?:(?:private|public|protected|readonly|static|declare)\s+)*"
        + re.escape(name) + r"[?!]?\s*[:=(]"
    )
    for i in range(s + 1, e or len(lines)):
        m = decl.match(lines[i])
        if not m:
            continue
        # method if the signature line opens a body
        head = lines[i]
        if "(" in head.split(name, 1)[1][:3] or re.search(re.escape(name) + r"\s*\(", head):
            depth = 0
            for j in range(i, e or len(lines)):
                depth += lines[j].count("{") - lines[j].count("}")
                if depth == 0 and j > i and lines[j].rstrip().endswith("}"):
                    return "method", lines[i:j + 1]
            return None, None
        # field: may span lines until the statement ends
        buf = [lines[i]]
        j = i
        while not buf[-1].rstrip().endswith(";") and j + 1 < len(lines):
            j += 1
            buf.append(lines[j])
        return "field", buf
    return None, None


fields, methods, notfound = [], [], []
for name in missing:
    got = False
    for tag in ("theirs", "ours"):
        kind, block = extract(parents[tag], name)
        if block:
            (fields if kind == "field" else methods).append((name, block, tag))
            got = True
            break
    if not got:
        notfound.append(name)

s, _e = class_span(cur)
if s is None:
    print("class %s not found in merged file" % cls)
    sys.exit(1)

# Insert every ported member immediately after the class opening line. Class
# members are order-independent in TS, and this never needs the closing brace -
# brace counting is unreliable in a file this full of template literals.
block = [l for _, b, _ in fields for l in b] + [l for _, b, _ in methods for l in b]
if block:
    cur[s + 1:s + 1] = block

io.open(repo + "/" + rel, "w", encoding="utf-8", newline="\n").write("\n".join(cur))
print("ported into %s: %d field(s), %d method(s)" % (cls, len(fields), len(methods)))
for n, _, tag in fields:
    print("   field  %-28s from %s" % (n, tag))
for n, _, tag in methods:
    print("   method %-28s from %s" % (n, tag))
if notfound:
    print("NOT FOUND in either parent (%d): %s" % (len(notfound), ", ".join(notfound)))
