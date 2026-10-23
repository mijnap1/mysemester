"""Shared constants: frame size, palette, timing anchors, and small easing helpers."""
import json
import math
import os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
FONT = os.path.join(ASSETS, "Outfit.ttf")
LOGO = os.path.join(ROOT, "public", "mysemesterlogo.png")
VO = os.path.join(ROOT, "vo", "voiceover.mp3")

FPS = 60
DURATION = 23.0
NFRAMES = int(round(DURATION * FPS))

# World units are logical pixels of a 1920x1080 frame. A plane at distance F
# from the camera, facing it, maps 1:1 onto the screen (its "home pose").
LW, LH = 1920, 1080
FOV_X = math.radians(50)
F = (LW / 2) / math.tan(FOV_X / 2)

SIGNATURE = "Made in code by Jamie Ryu"
URL = "mysemester.org"

with open(os.path.join(ROOT, "vo", "anchors.json")) as fh:
    _anchors = json.load(fh)
A = _anchors["words"]
MUSIC = _anchors["music"]


def hexc(h, a=1.0):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(round(a * 255)))


# Palette: the site's own tokens (app/main/main.css) on a dark stage.
STAGE = "#070B14"
BG = "#0b1220"
CARD = "#0f172a"
CARD_HI = "#131d33"
LINE = "#1f2937"
LINE_HI = "#334155"
TEXT = "#e5e7eb"
MUTED = "#94a3b8"
DIM = "#64748b"
BLUE = "#2563eb"
BLUE_LIP = "#1d4ed8"
BLUE_MID = "#3b82f6"
LIGHT = "#60a5fa"
PALE = "#93c5fd"
ICE = "#dbeafe"
GREEN = "#22c55e"
PURPLE = "#7c3aed"
VIOLET = "#a78bfa"
PAPER = "#e9eef5"
INK = "#0f172a"
INK_MUTED = "#6b7280"
WARM = "#f59e0b"


def rgb01(h):
    c = hexc(h)
    return np.array(c[:3], np.float32) / 255.0


# ---- easing ---------------------------------------------------------------

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    return a + (b - a) * t


def prog(t, a, b):
    """Linear 0..1 between a and b, clamped."""
    if b <= a:
        return 1.0 if t >= b else 0.0
    return clamp((t - a) / (b - a))


def bezier(x1, y1, x2, y2):
    """CSS cubic-bezier easing as a function of x in 0..1."""
    def bx(s): return 3 * x1 * s * (1 - s) ** 2 + 3 * x2 * s * s * (1 - s) + s ** 3
    def by(s): return 3 * y1 * s * (1 - s) ** 2 + 3 * y2 * s * s * (1 - s) + s ** 3

    def f(x):
        if x <= 0: return 0.0
        if x >= 1: return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(28):
            mid = (lo + hi) / 2
            if bx(mid) < x: lo = mid
            else: hi = mid
        return by((lo + hi) / 2)
    return f


ease_site = bezier(0.22, 1, 0.36, 1)      # the site's --ease
ease_io = bezier(0.65, 0, 0.35, 1)
ease_in = bezier(0.55, 0, 1, 0.45)
ease_out = bezier(0.0, 0.55, 0.45, 1)


def ep(t, a, b, fn=ease_site):
    return fn(prog(t, a, b))


def spring(t, freq=4.0, damp=0.32):
    """Damped spring from 0 to 1 for t>=0 (seconds). Overshoots, settles."""
    if t <= 0:
        return 0.0
    w = 2 * math.pi * freq
    wd = w * math.sqrt(max(1e-6, 1 - damp * damp))
    return 1 - math.exp(-damp * w * t) * (math.cos(wd * t) + damp * w / wd * math.sin(wd * t))


def wobble(t, freq=6.0, damp=5.0):
    """Decaying sine for squash/stretch and shake, starting at 0 when t=0."""
    if t <= 0:
        return 0.0
    return math.exp(-damp * t) * math.sin(2 * math.pi * freq * t)
