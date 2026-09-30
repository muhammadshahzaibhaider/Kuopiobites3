#!/usr/bin/env python3
"""Convert tmp/menu/*.jpg → public/menu/<cat>/<key>.webp (1200x1200), validated against the images.ts manifest."""
from PIL import Image
import os, glob, re, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, "src/lib/images.ts"), encoding="utf-8").read()
valid = {}
for cat, key in re.findall(r'\["([a-z]+)",\s*"([a-z0-9\-]+)",', src):
    valid.setdefault(cat, set()).add(key)
allkeys = {k for ks in valid.values() for k in ks}

made, skipped = [], []
for f in sorted(glob.glob(os.path.join(root, "tmp/menu/*.jpg"))):
    slug = os.path.splitext(os.path.basename(f))[0]
    if slug not in allkeys:
        skipped.append(slug); continue
    im = Image.open(f).convert("RGB")
    w, h = im.size; s = min(w, h)
    im = im.crop(((w-s)//2, (h-s)//2, (w-s)//2+s, (h-s)//2+s)).resize((1200, 1200), Image.LANCZOS)
    cat = next(c for c, ks in valid.items() if slug in ks)
    os.makedirs(os.path.join(root, "public/menu", cat), exist_ok=True)
    out = os.path.join(root, "public/menu", cat, slug + ".webp")
    im.save(out, "WEBP", quality=82, method=6)
    made.append((out, os.path.getsize(out)//1024))
print(f"converted {len(made)}, skipped {len(skipped)} {skipped}")
for m, kb in made: print(f"  {os.path.relpath(m, root)}  {kb} KB")
