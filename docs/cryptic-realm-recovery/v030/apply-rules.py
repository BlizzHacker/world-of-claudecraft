#!/usr/bin/env python3
"""Rule-driven conflict resolver for the v0.30.0 one-jump merge.

Operates on conflict hunks structurally, so no fragile exact-text matching.

Rules
  ours            keep our side
  theirs          keep upstream's side
  union           theirs then ours (both are additions)
  union_ours_first  ours then theirs
  union_unique    theirs, then only our lines whose declared identifier upstream
                  does not already declare (prevents duplicate interface members
                  when upstream CHANGED a signature we also touched)
  theirs_rebrand  upstream's side with fork branding reapplied

Usage: apply_rules.py <repo> <rulefile>      rulefile lines: "<rule> <path>"
"""
import io
import re
import sys

BRAND = [
    ("World of ClaudeCraft", "Cryptic Realm"),
    ("World of Claudecraft", "Cryptic Realm"),
    ("worldofclaudecraft.com", "crypticrealm.com"),
]
IDENT = re.compile(r"^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[(:?]")


def ident(line):
    m = IDENT.match(line)
    return m.group(1) if m else None


def resolve(text, rule):
    out = []
    lines = text.split("\n")
    i = 0
    n = 0
    while i < len(lines):
        if not lines[i].startswith("<<<<<<<"):
            out.append(lines[i])
            i += 1
            continue
        n += 1
        i += 1
        ours = []
        while i < len(lines) and not lines[i].startswith("======="):
            ours.append(lines[i]); i += 1
        i += 1
        theirs = []
        while i < len(lines) and not lines[i].startswith(">>>>>>>"):
            theirs.append(lines[i]); i += 1
        i += 1  # skip >>>>>>>

        if rule == "ours":
            out.extend(ours)
        elif rule == "theirs":
            out.extend(theirs)
        elif rule == "union":
            out.extend(theirs); out.extend(ours)
        elif rule == "union_ours_first":
            out.extend(ours); out.extend(theirs)
        elif rule == "union_unique":
            declared = {ident(l) for l in theirs if ident(l)}
            out.extend(theirs)
            skip_comment_run = []
            for l in ours:
                idn = ident(l)
                if idn and idn in declared:
                    skip_comment_run = []
                    continue
                if l.strip().startswith("//"):
                    skip_comment_run.append(l)
                    continue
                out.extend(skip_comment_run); skip_comment_run = []
                out.append(l)
        elif rule == "theirs_rebrand":
            for l in theirs:
                for a, b in BRAND:
                    l = l.replace(a, b)
                out.append(l)
        else:
            raise SystemExit("unknown rule: %s" % rule)
    return "\n".join(out), n


def main():
    repo = sys.argv[1].rstrip("/")
    todo = []
    for raw in open(sys.argv[2]):
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        rule, path = raw.split(None, 1)
        todo.append((rule, path.strip()))

    for rule, path in todo:
        full = repo + "/" + path
        try:
            src = io.open(full, encoding="utf-8").read()
        except OSError as e:
            print("  SKIP %-46s %s" % (path, e))
            continue
        if "<<<<<<<" not in src:
            print("  none %-46s (already resolved)" % path)
            continue
        new, n = resolve(src, rule)
        io.open(full, "w", encoding="utf-8", newline="\n").write(new)
        left = new.count("<<<<<<<")
        print("  %-15s %-46s hunks=%d left=%d" % (rule, path, n, left))


main()
