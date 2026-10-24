"""Tile stills into one contact sheet: python3 film/sheet.py out.png a.png b.png ..."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f) for f in files]
w, h = ims[0].size
cols = 7 if h > w else 2
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), (40, 40, 40))
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + 6), f.split("/")[-1], fill=(255, 255, 0))
sheet.save(out)
