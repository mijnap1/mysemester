"""2D drawing for station faces: an anti-aliased premultiplied canvas in logical
units, plus the MySemester UI pieces rebuilt by eye from the real app."""
import functools
import math

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import config as C
from config import hexc
from engine import Texture

SS = 2          # supersampling inside the canvas
TS = 1.0        # texture pixels per logical unit (set by the renderer)


def set_scale(ts):
    global TS
    TS = ts
    for fn in _CACHED:
        fn.cache_clear()


_CACHED = []


def cached(fn):
    c = functools.lru_cache(maxsize=512)(fn)
    _CACHED.append(c)
    return c


@functools.lru_cache(maxsize=256)
def font(px, wt):
    f = ImageFont.truetype(C.FONT, max(1, int(round(px))))
    f.set_variation_by_axes([wt])
    return f


def text_w(s, size, wt=600):
    return font(size * 8, wt).getlength(s) / 8


class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.k = TS * SS
        self.W, self.H = max(1, int(round(w * self.k))), max(1, int(round(h * self.k)))
        self.buf = np.zeros((self.H, self.W, 4), np.float32)
        if bg:
            self.rect(0, 0, w, h, bg)

    # -- core: composite a coverage mask with a colour ---------------------

    def _comp(self, mask, ox, oy, color, alpha=1.0):
        m = np.asarray(mask, np.float32) / 255.0
        H, W = m.shape
        x0, y0 = max(0, ox), max(0, oy)
        x1, y1 = min(self.W, ox + W), min(self.H, oy + H)
        if x1 <= x0 or y1 <= y0:
            return
        m = m[y0 - oy:y1 - oy, x0 - ox:x1 - ox] * alpha * (hexc(color)[3] / 255 if isinstance(color, str) else 1)
        c = np.array(hexc(color)[:3], np.float32) / 255 if isinstance(color, str) else np.asarray(color, np.float32)
        reg = self.buf[y0:y1, x0:x1]
        reg *= (1 - m[..., None])
        reg[..., :3] += c * m[..., None]
        reg[..., 3] += m

    def _mask(self, x, y, w, h, pad=2):
        k = self.k
        ox, oy = int(math.floor(x * k)) - pad, int(math.floor(y * k)) - pad
        W, H = int(math.ceil(w * k)) + 2 * pad + 2, int(math.ceil(h * k)) + 2 * pad + 2
        im = Image.new("L", (max(1, W), max(1, H)), 0)
        return im, ImageDraw.Draw(im), ox, oy

    def _p(self, x, y, ox, oy):
        return (x * self.k - ox, y * self.k - oy)

    # -- primitives (logical coordinates) ----------------------------------

    def rect(self, x, y, w, h, color, alpha=1.0):
        self.rrect(x, y, w, h, 0, color, alpha)

    def rrect(self, x, y, w, h, r, color=None, alpha=1.0, outline=None, ow=1.5, oalpha=1.0):
        im, d, ox, oy = self._mask(x, y, w, h)
        p0, p1 = self._p(x, y, ox, oy), self._p(x + w, y + h, ox, oy)
        rr = r * self.k
        if color:
            d.rounded_rectangle([p0, (p1[0] - 1, p1[1] - 1)], radius=rr, fill=255)
            self._comp(im, ox, oy, color, alpha)
        if outline:
            im2, d2, _, _ = self._mask(x, y, w, h)
            d2.rounded_rectangle([p0, (p1[0] - 1, p1[1] - 1)], radius=rr, outline=255, width=max(1, int(round(ow * self.k))))
            self._comp(im2, ox, oy, outline, oalpha)

    def ellipse(self, cx, cy, rx, ry, color=None, alpha=1.0, outline=None, ow=1.5):
        im, d, ox, oy = self._mask(cx - rx, cy - ry, 2 * rx, 2 * ry)
        box = [self._p(cx - rx, cy - ry, ox, oy), self._p(cx + rx, cy + ry, ox, oy)]
        if color:
            d.ellipse(box, fill=255)
            self._comp(im, ox, oy, color, alpha)
        if outline:
            im2, d2, _, _ = self._mask(cx - rx, cy - ry, 2 * rx, 2 * ry)
            d2.ellipse(box, outline=255, width=max(1, int(round(ow * self.k))))
            self._comp(im2, ox, oy, outline, alpha)

    def arc(self, cx, cy, r, a0, a1, color, ow=2, alpha=1.0):
        im, d, ox, oy = self._mask(cx - r, cy - r, 2 * r, 2 * r, pad=int(ow * self.k) + 2)
        box = [self._p(cx - r, cy - r, ox, oy), self._p(cx + r, cy + r, ox, oy)]
        d.arc(box, a0, a1, fill=255, width=max(1, int(round(ow * self.k))))
        self._comp(im, ox, oy, color, alpha)

    def line(self, pts, color, width=2, alpha=1.0, joint="curve"):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        im, d, ox, oy = self._mask(min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys), pad=int(width * self.k) + 3)
        d.line([self._p(x, y, ox, oy) for x, y in pts], fill=255, width=max(1, int(round(width * self.k))), joint=joint)
        # round caps
        r = width * self.k / 2
        for x, y in (pts[0], pts[-1]):
            px, py = self._p(x, y, ox, oy)
            d.ellipse([px - r, py - r, px + r, py + r], fill=255)
        self._comp(im, ox, oy, color, alpha)

    def polygon(self, pts, color, alpha=1.0):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        im, d, ox, oy = self._mask(min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))
        d.polygon([self._p(x, y, ox, oy) for x, y in pts], fill=255)
        self._comp(im, ox, oy, color, alpha)

    def text(self, x, y, s, size, wt=600, color=C.TEXT, anchor="ls", alpha=1.0, track=0.0):
        """anchor like PIL: l/m/r + a/m/s/d. y is the anchor's vertical reference."""
        f = font(size * self.k, wt)
        if track:
            # manual letter spacing
            tw = sum(text_w(ch, size, wt) for ch in s) + track * (len(s) - 1)
            xx = x - (tw / 2 if anchor[0] == "m" else tw if anchor[0] == "r" else 0)
            for ch in s:
                self.text(xx, y, ch, size, wt, color, "l" + anchor[1], alpha)
                xx += text_w(ch, size, wt) + track
            return
        x0, y0, x1, y1 = f.getbbox(s, anchor=anchor)
        px, py = x * self.k, y * self.k
        ox, oy = int(math.floor(px + x0)) - 2, int(math.floor(py + y0)) - 2
        im = Image.new("L", (int(x1 - x0) + 6, int(y1 - y0) + 6), 0)
        ImageDraw.Draw(im).text((px - ox, py - oy), s, font=f, fill=255, anchor=anchor)
        self._comp(im, ox, oy, color, alpha)

    def paste(self, other, x, y):
        """Composite another Canvas (same scale) at logical x, y."""
        ox, oy = int(round(x * self.k)), int(round(y * self.k))
        H, W = other.buf.shape[:2]
        x0, y0, x1, y1 = max(0, ox), max(0, oy), min(self.W, ox + W), min(self.H, oy + H)
        if x1 <= x0 or y1 <= y0:
            return
        src = other.buf[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        reg = self.buf[y0:y1, x0:x1]
        reg *= (1 - src[..., 3:4])
        reg += src

    def tex(self):
        w, h = max(1, int(round(self.w * TS))), max(1, int(round(self.h * TS)))
        img = cv2.resize(self.buf, (w, h), interpolation=cv2.INTER_AREA)
        return Texture(np.clip(img, 0, 1).astype(np.float32))


# ---- icons (stroke style like the app's ionicons) --------------------------

def icon(cv, kind, cx, cy, s, color=C.BLUE_MID, w=2.6):
    if kind == "flask":
        cv.line([(cx - s * .22, cy - s * .5), (cx - s * .22, cy - s * .12), (cx - s * .5, cy + s * .42),
                 (cx + s * .5, cy + s * .42), (cx + s * .22, cy - s * .12), (cx + s * .22, cy - s * .5)], color, w)
        cv.line([(cx - s * .32, cy - s * .5), (cx + s * .32, cy - s * .5)], color, w)
        cv.line([(cx - s * .36, cy + s * .16), (cx + s * .36, cy + s * .16)], color, w)
    elif kind == "planet":
        cv.ellipse(cx, cy, s * .3, s * .3, outline=color, ow=w)
        cv.ellipse(cx, cy, s * .55, s * .2, outline=color, ow=w)
    elif kind == "note":
        cv.ellipse(cx - s * .2, cy + s * .3, s * .16, s * .13, outline=color, ow=w)
        cv.ellipse(cx + s * .3, cy + s * .2, s * .16, s * .13, outline=color, ow=w)
        cv.line([(cx - s * .04, cy + s * .3), (cx - s * .04, cy - s * .42), (cx + s * .46, cy - s * .52), (cx + s * .46, cy + s * .2)], color, w)
    elif kind == "globe":
        cv.ellipse(cx, cy, s * .45, s * .45, outline=color, ow=w)
        cv.ellipse(cx, cy, s * .2, s * .45, outline=color, ow=w)
        cv.line([(cx - s * .45, cy), (cx + s * .45, cy)], color, w)
        cv.line([(cx - s * .38, cy - s * .22), (cx + s * .38, cy - s * .22)], color, w * .8)
        cv.line([(cx - s * .38, cy + s * .22), (cx + s * .38, cy + s * .22)], color, w * .8)
    elif kind == "wallet":
        cv.rrect(cx - s * .48, cy - s * .32, s * .96, s * .7, s * .1, outline=color, ow=w)
        cv.line([(cx - s * .4, cy - s * .32), (cx + s * .3, cy - s * .5)], color, w)
        cv.ellipse(cx + s * .26, cy + s * .04, s * .05, s * .05, color)
    elif kind == "folder":
        cv.line([(cx - s * .5, cy + s * .38), (cx - s * .5, cy - s * .38), (cx - s * .12, cy - s * .38),
                 (cx, cy - s * .24), (cx + s * .5, cy - s * .24), (cx + s * .5, cy + s * .38), (cx - s * .5, cy + s * .38)], color, w)
        cv.line([(cx - s * .5, cy - s * .08), (cx + s * .5, cy - s * .08)], color, w)
    elif kind == "check":
        cv.line([(cx - s * .4, cy), (cx - s * .1, cy + s * .3), (cx + s * .45, cy - s * .32)], color, w)
    elif kind == "cap":
        cv.polygon([(cx - s * .5, cy - s * .08), (cx, cy - s * .36), (cx + s * .5, cy - s * .08), (cx, cy + s * .18)], color)
        cv.polygon([(cx - s * .3, cy + s * .06), (cx - s * .3, cy + s * .32), (cx, cy + s * .48), (cx + s * .3, cy + s * .32), (cx + s * .3, cy + s * .06), (cx, cy + s * .24)], color)


# ---- generic pieces --------------------------------------------------------

@cached
def text_tex(s, size, wt=700, color=C.TEXT, track=0.0):
    w = (text_w(s, size, wt) + track * max(0, len(s) - 1)) + size * 0.3
    h = size * 1.35
    cv = Canvas(w, h)
    cv.text(w / 2, h * 0.74, s, size, wt, color, "ms", track=track)
    return cv.tex(), (w, h)


@cached
def logo_tex(px):
    im = Image.open(C.LOGO).convert("RGBA")
    n = max(8, int(round(px * TS)))
    a = np.asarray(im.resize((n, n), Image.LANCZOS), np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    return Texture(a)


@cached
def glow_tex(color=C.BLUE, n=128):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    d = np.sqrt((xx - n / 2) ** 2 + (yy - n / 2) ** 2) / (n / 2)
    g = np.exp(-d * d * 4.0) * (d < 1)
    c = np.array(hexc(color)[:3], np.float32) / 255
    rgba = np.concatenate([g[..., None] * c, g[..., None]], 2).astype(np.float32)
    return Texture(rgba)


@cached
def shard_tex(color):
    cv = Canvas(40, 40)
    cv.polygon([(20, 2), (38, 30), (6, 38)], color)
    return cv.tex()


@cached
def course_card(code, name, pct, kind, lit=False):
    w, h = 440, 136
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 22, C.CARD, outline=C.LIGHT if lit else C.LINE, ow=2 if lit else 1.5,
             oalpha=0.9 if lit else 1.0)
    icon(cv, kind, 62, h / 2, 46)
    cv.text(112, 60, code, 30, 750, "#f1f5f9")
    cv.text(112, 92, name, 19, 450, C.MUTED)
    cv.text(w - 30, 80, f"{pct}%", 34, 750, C.LIGHT, "rs")
    return cv.tex(), (w, h)


@cached
def mini_card(code, pct):
    w, h = 210, 62
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 14, C.CARD_HI, outline=C.LINE_HI, ow=1.2)
    cv.text(20, 40, code, 21, 700, "#f1f5f9")
    cv.text(w - 18, 40, f"{pct}%", 21, 700, C.LIGHT, "rs")
    return cv.tex(), (w, h)


@cached
def chip_tex(s, accent=False, size=44):
    w = text_w(s, size, 650) + size * 1.25
    h = size * 1.9
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, h / 2, C.CARD_HI, outline=C.LIGHT if accent else C.LINE_HI, ow=1.6, oalpha=0.85 if accent else 1)
    cv.text(w / 2, h * 0.66, s, size, 650, C.PALE if accent else "#e2e8f0", "ms")
    return cv.tex(), (w, h)


@cached
def wordmark_tex(size=150):
    s = "MySemester"
    w = text_w(s, size, 800) + size * 0.2
    h = size * 1.3
    cv = Canvas(w, h)
    cv.text(w / 2, h * 0.76, s, size, 800, "#f8fafc", "ms", track=-size * 0.012)
    return cv.tex(), (w, h)


# ---- the syllabus ----------------------------------------------------------

GRADING = [("Lab Reports", 15), ("Pre-lab Quizzes", 10), ("Term Test 1", 20), ("Term Test 2", 20), ("Final Exam", 35)]
PDF_W, PDF_H = 560, 760
PDF_ROW_Y0, PDF_ROW_H = 468, 46


@cached
def pdf_page():
    w, h = PDF_W, PDF_H
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 10, C.PAPER)
    cv.rect(0, 0, w, 10, C.BLUE, 0.0)
    cv.text(40, 70, "BIO130", 34, 800, C.INK)
    cv.text(40, 102, "Molecular and Cell Biology · Course Outline", 17, 500, C.INK_MUTED)
    cv.rect(40, 124, w - 80, 1.5, "#e2e8f0")
    cv.text(40, 168, "Course description", 18, 700, C.INK)
    rng = np.random.default_rng(3)
    y = 188
    for i in range(6):
        lw = (w - 80) * (rng.uniform(0.72, 1.0) if i < 5 else 0.5)
        cv.rrect(40, y, lw, 9, 4.5, "#cbd5e1")
        y += 21
    cv.text(40, 342, "Learning outcomes", 18, 700, C.INK)
    y = 362
    for i in range(3):
        cv.ellipse(46, y + 4.5, 3, 3, "#94a3b8")
        cv.rrect(58, y, (w - 100) * rng.uniform(0.55, 0.9), 9, 4.5, "#cbd5e1")
        y += 21
    cv.text(40, 450, "Grading", 18, 700, C.INK)
    # the rows themselves are separate sprites that lift off
    cv.text(40, 718, "Late work loses 10% per day.", 14, 500, "#94a3b8")
    return cv.tex(), (w, h)


@cached
def pdf_row(i):
    name, wt = GRADING[i]
    w, h = PDF_W - 60, PDF_ROW_H
    cv = Canvas(w, h)
    cv.rect(0, 0, w, h, C.PAPER)
    cv.text(10, 29, name, 19, 550, C.INK)
    nw = text_w(name, 19, 550)
    x = 22 + nw
    while x < w - 70:
        cv.ellipse(x, 25, 1.5, 1.5, "#94a3b8")
        x += 9
    cv.text(w - 10, 29, f"{wt}%", 19, 700, C.INK, "rs")
    return cv.tex(), (w, h)


# ---- the grade page (dark) -------------------------------------------------

TBL_W, TBL_H = 900, 640
ROW_Y0, ROW_H = 192, 74
COL_NAME, COL_WT, COL_GRADE = 56, 430, 650
RING = (796, 86, 54)
BAR = (150, 598, 600, 10)     # x, y, w, h


@cached
def table_card():
    w, h = TBL_W, TBL_H
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 26, C.CARD, outline=C.LINE, ow=1.6)
    icon(cv, "flask", 64, 78, 50)
    cv.text(110, 74, "BIO130", 42, 800, "#f8fafc")
    cv.text(110, 108, "Molecular and Cell Biology", 21, 450, C.MUTED)
    cv.ellipse(RING[0], RING[1], RING[2], RING[2], outline=C.LINE_HI, ow=7)
    cv.rect(0, 140, w, 44, "#111a2e")
    cv.text(COL_NAME, 169, "Assessment", 19, 650, C.LIGHT)
    cv.text(COL_WT, 169, "Weight (%)", 19, 650, C.LIGHT, "ms")
    cv.text(COL_GRADE, 169, "Your Grade", 19, 650, C.LIGHT, "ms")
    for i in range(5):
        y = ROW_Y0 + i * ROW_H
        if i:
            cv.rect(24, y, w - 48, 1.2, C.LINE)
        cv.rrect(COL_GRADE - 75, y + 13, 150, 48, 11, "#0b1220", outline=C.LINE_HI, ow=1.4)
        cv.rrect(COL_NAME - 8, y + 24, 230, 26, 8, "#131d33", 0.55)
    cv.text(40, 610, "Weights", 18, 600, C.MUTED)
    bx, by, bw, bh = BAR
    cv.rrect(bx, by, bw, bh, bh / 2, "#1e293b")
    return cv.tex(), (w, h)


@cached
def table_row(i):
    name, wt = GRADING[i]
    w, h = 520, ROW_H
    cv = Canvas(w, h)
    cv.rect(0, 0, w, h, C.CARD)
    cv.text(10, 45, name, 22, 550, "#e5e7eb")
    cv.text(COL_WT - COL_NAME + 10, 45, str(wt), 22, 600, "#e5e7eb", "ms")
    return cv.tex(), (w, h)


@cached
def bar_fill():
    bx, by, bw, bh = BAR
    cv = Canvas(bw, bh)
    cv.rrect(0, 0, bw, bh, bh / 2, C.BLUE_MID)
    return cv.tex(), (bw, bh)


# ---- GPA dashboard ---------------------------------------------------------

GPA_W, GPA_H = 780, 400


@cached
def gpa_tile(school, scale, lit=True):
    w, h = GPA_W, GPA_H
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 32, C.CARD, outline=C.LIGHT if lit else C.LINE, ow=2 if lit else 1.6, oalpha=0.55)
    cv.text(48, 72, "GPA", 30, 700, "#f1f5f9")
    cv.text(w - 48, 72, scale, 22, 550, C.MUTED, "rs")
    cv.rrect(44, h - 76, text_w(school, 20, 600) + 40, 40, 20, "#131d33", outline=C.LINE_HI, ow=1.2)
    cv.text(64, h - 49, school, 20, 600, C.PALE)
    return cv.tex(), (w, h)


@cached
def side_tile(label, value):
    w, h = 340, 196
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 26, C.CARD, outline=C.LINE, ow=1.5)
    cv.text(32, 56, label, 21, 600, C.MUTED)
    cv.text(32, 150, value, 64, 800, "#f1f5f9")
    return cv.tex(), (w, h)


def odometer(value, size=210, digits_fmt="{:.2f}", color="#f8fafc"):
    """Fixed digit cells; each cell rolls like a mechanical counter."""
    s = digits_fmt.format(value)
    cell_w, dot_w = size * 0.62, size * 0.3
    w = sum(dot_w if ch == "." else cell_w for ch in s)
    h = size * 1.12
    cv = Canvas(w, h)
    places = [i for i, ch in enumerate(s) if ch.isdigit()]
    ndec = len(s) - s.index(".") - 1 if "." in s else 0
    x = 0.0
    base = h * 0.82
    for i, ch in enumerate(s):
        if ch == ".":
            cv.text(x + dot_w / 2, base, ".", size, 800, color, "ms")
            x += dot_w
            continue
        k = places.index(i)
        p = 10 ** (len(places) - 1 - k - ndec)
        q = value / p
        d = int(math.floor(q + 1e-9)) % 10
        if k == len(places) - 1:
            r = q - math.floor(q + 1e-9)
        else:
            low = (q - math.floor(q + 1e-9)) * 10
            r = max(0.0, low - 9.0)
        r = r if r <= 0.7 else 0.7 + 0.3 * (1 - (1 - (r - 0.7) / 0.3) ** 3)
        r = 0.0 if r < 0.7 else (r - 0.7) / 0.3
        sub = Canvas(cell_w, h)
        sub.text(cell_w / 2, base - r * h, str(d), size, 800, color, "ms")
        sub.text(cell_w / 2, base + (1 - r) * h, str((d + 1) % 10), size, 800, color, "ms")
        cv.paste(sub, x, 0)
        x += cell_w
    return cv.tex(), (w, h)


# ---- semesters -------------------------------------------------------------

@cached
def folder_card(term, n, lit):
    w, h = 400, 136
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 24, C.CARD if not lit else "#0f1b33", outline=C.LIGHT if lit else C.LINE,
             ow=2 if lit else 1.5, oalpha=0.85 if lit else 1)
    icon(cv, "folder", 62, h / 2, 50, C.LIGHT if lit else C.DIM, 2.6)
    cv.text(112, 64, term, 30, 750, "#f8fafc" if lit else C.MUTED)
    cv.text(112, 96, f"{n} courses", 19, 500, C.MUTED if lit else C.DIM)
    return cv.tex(), (w, h)


@cached
def point_label(s, lit=True):
    w, h = 120, 52
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 26, C.CARD_HI, outline=C.LIGHT if lit else C.LINE_HI, ow=1.4, oalpha=0.7)
    cv.text(w / 2, 35, s, 25, 700, C.PALE, "ms")
    return cv.tex(), (w, h)


@cached
def dot_tex(color=C.ICE):
    cv = Canvas(30, 30)
    cv.ellipse(15, 15, 12, 12, C.BLUE, 1.0)
    cv.ellipse(15, 15, 7, 7, color)
    return cv.tex(), (30, 30)


@cached
def cumulative_tile(value_str):
    w, h = 470, 118
    cv = Canvas(w, h)
    cv.rrect(0, 0, w, h, 59, C.CARD_HI, outline=C.LIGHT, ow=1.8, oalpha=0.8)
    cv.text(46, 72, "Cumulative GPA", 26, 600, C.MUTED)
    cv.text(w - 44, 78, value_str, 52, 800, "#f8fafc", "rs")
    return cv.tex(), (w, h)


# ---- type ------------------------------------------------------------------

@cached
def tagline(line, size=124):
    if line == 0:
        parts = [("Every grade,", "#f8fafc")]
    else:
        parts = [("one ", "#f8fafc"), ("calm", C.PALE), (" semester.", "#f8fafc")]
    full = "".join(p for p, _ in parts)
    w = text_w(full, size, 750) + size * 0.25
    h = size * 1.32
    cv = Canvas(w, h)
    x = size * 0.12
    for p, col in parts:
        cv.text(x, h * 0.74, p, size, 750, col, "ls")
        x += text_w(p, size, 750)
    return cv.tex(), (w, h)


@cached
def end_text(s, size, wt, color):
    return text_tex(s, size, wt, color)
