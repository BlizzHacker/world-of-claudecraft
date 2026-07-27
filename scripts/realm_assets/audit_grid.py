#!/usr/bin/env python3
"""Montage the mass-audit hero renders into numbered review sheets, per realm.

Cell numbers are GLOBAL indices into that realm's sorted key list, so a review
note like "infernal 12,19,33" maps straight back to keys via _index.json.

  python3 audit_grid.py --realm infernal --page 0 --out /tmp/grids
"""
import json
import os
import sys
from PIL import Image, ImageDraw

SRC = "/tmp/audit_all"
CELL = 190
PAD = 22
COLS, ROWS = 8, 5


def arg(n, d=None):
    return sys.argv[sys.argv.index(f"--{n}") + 1] if f"--{n}" in sys.argv else d


def keys_for(realm):
    d = os.path.join(SRC, realm)
    return sorted(f[:-4] for f in os.listdir(d) if f.endswith(".png"))


def main():
    realm = arg("realm", "infernal")
    page = int(arg("page", 0))
    out = arg("out", "/tmp/grids")
    os.makedirs(out, exist_ok=True)
    keys = keys_for(realm)
    per = COLS * ROWS
    chunk = keys[page * per:(page + 1) * per]
    if not chunk:
        print("empty page")
        return
    W, H = COLS * CELL, ROWS * (CELL + PAD)
    sheet = Image.new("RGB", (W, H), (20, 20, 24))
    dr = ImageDraw.Draw(sheet)
    for i, k in enumerate(chunk):
        c, r = i % COLS, i // COLS
        x, y = c * CELL, r * (CELL + PAD)
        p = os.path.join(SRC, realm, f"{k}.png")
        try:
            im = Image.open(p).convert("RGB")
            im.thumbnail((CELL - 6, CELL - 6), Image.LANCZOS)
            sheet.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
        except Exception:
            pass
        dr.rectangle([x, y + CELL, x + CELL, y + CELL + PAD], fill=(8, 8, 10))
        dr.text((x + 4, y + CELL + 5), str(page * per + i), fill=(255, 215, 60))
        dr.rectangle([x, y, x + CELL - 1, y + CELL + PAD - 1], outline=(52, 52, 60))
    dest = os.path.join(out, f"{realm}_p{page}.png")
    sheet.save(dest)
    print(f"{dest} :: {len(chunk)} cells, idx {page*per}..{page*per+len(chunk)-1} of {len(keys)}")


if __name__ == "__main__":
    main()
