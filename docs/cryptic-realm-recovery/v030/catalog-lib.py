#!/usr/bin/env python3
"""Shared nested-catalog parser for src/ui/i18n.catalog/*.ts.

These are TS object literals nested a few levels deep, with unquoted identifier
keys and string values that may span lines. Upstream carries hundreds of
translator-facing comments (787 in hud_chrome.ts alone), so any merge must edit
upstream's lines in place rather than re-emit the object.

parse() -> (lines, leaves, groups)
  leaves: path tuple -> dict(start, end, indent, value)   # end exclusive
  groups: path tuple -> dict(open, close, indent)         # close = line of '}'
"""
import re
import subprocess

GROUP_OPEN = re.compile(r"^(\s*)((?:[A-Za-z_$][\w$]*)|'[^']*'|\"[^\"]*\")\s*:\s*\{\s*$")
LEAF_START = re.compile(r"^(\s*)((?:[A-Za-z_$][\w$]*)|'[^']*'|\"[^\"]*\")\s*:\s*(.*)$")
CLOSE = re.compile(r"^(\s*)\}[,;]?\s*$")


def keyname(raw):
    if raw and raw[0] in "'\"":
        return raw[1:-1]
    return raw


def stage(repo, n, path):
    r = subprocess.run(["git", "-C", repo, "show", ":%d:%s" % (n, path)],
                       capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def _balanced(s):
    """True if quotes/braces/brackets in s are balanced enough to end an entry."""
    depth = 0
    i = 0
    q = None
    while i < len(s):
        c = s[i]
        if q:
            if c == "\\":
                i += 2
                continue
            if c == q:
                q = None
        else:
            if c in "'\"`":
                q = c
            elif c in "{[(":
                depth += 1
            elif c in "}])":
                depth -= 1
        i += 1
    return q is None and depth <= 0


def parse(text):
    lines = text.split("\n")
    leaves, groups = {}, {}
    stack = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = GROUP_OPEN.match(line)
        if m:
            stack.append(keyname(m.group(2)))
            groups[tuple(stack)] = {"open": i, "indent": m.group(1), "close": None}
            i += 1
            continue
        m = CLOSE.match(line)
        if m:
            if stack:
                g = groups.get(tuple(stack))
                if g is not None:
                    g["close"] = i
                stack.pop()
            i += 1
            continue
        m = LEAF_START.match(line)
        if m and not line.strip().startswith("//"):
            indent, raw, rest = m.group(1), m.group(2), m.group(3)
            start = i
            buf = rest
            while not (_balanced(buf) and buf.rstrip().endswith(",")):
                i += 1
                if i >= len(lines):
                    break
                buf += "\n" + lines[i]
            path = tuple(stack + [keyname(raw)])
            leaves[path] = {
                "start": start,
                "end": i + 1,
                "indent": indent,
                "value": buf.rstrip().rstrip(","),
            }
            i += 1
            continue
        i += 1
    return lines, leaves, groups
