"""The film: one camera flight through five stations, and one line of light
that does every job along the way. Everything is a function of time t (s)."""
import math

import numpy as np

import config as C
from config import A, F, clamp, lerp, prog, ep, ease_io, ease_in, ease_out, ease_site, spring, wobble
import draw as D
from engine import Camera, Frame, Light, Sprite

V = np.array

# ---- world layout -----------------------------------------------------------

ST1 = V([0.0, 0.0, 0.0])          # hook + lock-up
ST2 = V([2600.0, 350.0, 3400.0])  # syllabus + grade page
ST3 = V([5600.0, -450.0, 5900.0])  # GPA
ST5 = V([8600.0, 150.0, 8800.0])  # semesters
ST6 = V([11400.0, 0.0, 11600.0])  # type + hero

PDF_C = (-470.0, 0.0)             # local to ST2
TBL_TL = (-120.0, -320.0)          # table card top-left, local to ST2


def st2(x, y, z=0.0):
    return ST2 + V([x, y, z])


def tbl(x, y, z=-1.0):
    return ST2 + V([TBL_TL[0] + x, TBL_TL[1] + y, z])


def pdf(x, y, z=-1.0):
    """PDF page coords (top-left origin) to world."""
    return ST2 + V([PDF_C[0] - D.PDF_W / 2 + x, PDF_C[1] - D.PDF_H / 2 + y, z])


GPA_TL = V([-D.GPA_W / 2, -D.GPA_H / 2, 0.0])


def gpa(x, y, z=-1.0):
    return ST3 + GPA_TL + V([x, y, z])


SEM_X = [-560.0, 0.0, 560.0]
SEM_PTS = [(-560.0, -90.0), (0.0, -170.0), (560.0, -250.0)]
SEM_GPA = [3.42, 3.61, 3.71]
SEM_TERMS = [("Fall 2025", 5), ("Winter 2026", 5), ("Fall 2026", 4)]
SEM_COURSES = [[("MAT135", 81), ("CSC108", 88), ("PSY100", 84)],
               [("MAT136", 79), ("CSC148", 90), ("ECO101", 86)],
               [("BIO130", 85), ("PHY131", 78), ("MUS111", 91)]]

WM_SIZE = 150
ICON_PX = 190
PORTRAIT = False
TAG = 124

HOOK_CARDS_LAND = [("BIO130", "Molecular and Cell Biology", 86, "flask", (-640, -300, 180), 9),
                   ("PHY131", "Introduction to Physics I", 78, "planet", (650, -310, 260), -10),
                   ("MUS111", "Introduction to Music", 91, "note", (-700, 300, 320), 8),
                   ("ANT100", "Intro to Anthropology", 70, "globe", (700, 290, 120), -8),
                   ("ECO102", "Principles of Macroeconomics", 73, "wallet", (0, 430, 480), 0)]
HOOK_CARDS_PORT = [("BIO130", "Molecular and Cell Biology", 86, "flask", (-200, -720, 180), 9),
                   ("PHY131", "Introduction to Physics I", 78, "planet", (210, -470, 260), -10),
                   ("MUS111", "Introduction to Music", 91, "note", (-210, 470, 320), 8),
                   ("ANT100", "Intro to Anthropology", 70, "globe", (200, 720, 120), -8),
                   ("ECO102", "Principles of Macroeconomics", 73, "wallet", (0, 980, 480), 0)]
HOOK_CARDS = HOOK_CARDS_LAND
FOLDER_Y = 250.0
SEM_TILE_Y = -470.0
CHART_IN, CHART_OUT = (-960.0, 10.0), (800.0, -300.0)


def configure(portrait):
    """Switch every station to the 9:16 layout (or back). Call before rendering."""
    global PORTRAIT, TAG, WM_SIZE, PDF_C, TBL_TL, SEM_X, SEM_PTS, HOOK_CARDS, FOLDER_Y, SEM_TILE_Y, CHART_IN, CHART_OUT
    global CAM_KEYS, _HEAD_T
    PORTRAIT = portrait
    if portrait:
        TAG = 100
        WM_SIZE = 130
        PDF_C = (0.0, -350.0)
        TBL_TL = (-450.0, 90.0)
        SEM_PTS = [(-340.0, -380.0), (0.0, -480.0), (340.0, -580.0)]
        SEM_X = [0.0, 0.0, 0.0]
        HOOK_CARDS = HOOK_CARDS_PORT
        FOLDER_Y = 40.0
        SEM_TILE_Y = -800.0
        CHART_IN, CHART_OUT = (-700.0, -300.0), (620.0, -640.0)
    else:
        TAG = 124
        WM_SIZE = 150
        PDF_C = (-470.0, 0.0)
        TBL_TL = (-120.0, -320.0)
        SEM_PTS = [(-560.0, -90.0), (0.0, -170.0), (560.0, -250.0)]
        SEM_X = [-560.0, 0.0, 560.0]
        HOOK_CARDS = HOOK_CARDS_LAND
        FOLDER_Y = 250.0
        SEM_TILE_Y = -470.0
        CHART_IN, CHART_OUT = (-960.0, 10.0), (800.0, -300.0)
    _STATE.clear()
    CAM_KEYS = None
    _HEAD_T = None


def folder_pos(i):
    if PORTRAIT:
        return V([0.0, FOLDER_Y + 175.0 * i, 0.0])
    return V([SEM_X[i], FOLDER_Y, 0.0])


def hook_xy(p):
    """Squeeze a landscape hook position into the portrait frame."""
    if not PORTRAIT:
        return V(p, float)
    return V([p[0] * 0.45, p[1] * 1.9, p[2]], float)


def tag_y(landscape_y):
    return landscape_y * TAG / 124


def lockup(center):
    """Icon + wordmark lock-up around a centre. Returns icon centre, wordmark
    centre, underline x0, x1, y (all world)."""
    tw = D.text_w("MySemester", WM_SIZE, 800) - WM_SIZE * 0.012 * 9
    sw = tw + WM_SIZE * 0.2
    if PORTRAIT:
        # stacked: icon above the wordmark
        icon_c = center + V([0, -175, 0])
        wm_c = center + V([0, 40, 0])
        return icon_c, wm_c, sw, center[0] - tw / 2, center[0] + tw / 2, center[1] + 126
    gap = 34
    total = ICON_PX + gap + tw
    x0 = -total / 2
    icon_c = center + V([x0 + ICON_PX / 2, 0, 0])
    wm_c = center + V([x0 + ICON_PX + gap + tw / 2, 6, 0])
    ux0 = x0 + ICON_PX + gap
    ux1 = ux0 + tw
    return icon_c, wm_c, sw, center[0] + ux0, center[0] + ux1, center[1] + 92


# ---- the path of light ------------------------------------------------------

def _catmull(pts, n=40):
    pts = [V(p, float) for p in pts]
    P = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            u = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    out.append(pts[-1])
    return np.array(out)


def _seg(a, b, n=30):
    a, b = V(a, float), V(b, float)
    return np.array([a + (b - a) * (k / n) for k in range(n + 1)])


class Path:
    def __init__(self):
        self.pieces = []

    def add(self, name, pts):
        pts = np.asarray(pts, float)
        if self.pieces:
            prev = self.pieces[-1][1][-1]
            pts = np.vstack([prev[None], pts[1:]]) if np.allclose(prev, pts[0], atol=1e-3) else np.vstack([prev[None], pts])
        self.pieces.append((name, pts))

    def end(self):
        return self.pieces[-1][1][-1]

    def build(self, step=5.0):
        allp, marks = [], {}
        s_acc = 0.0
        for name, pts in self.pieces:
            d = np.linalg.norm(np.diff(pts, axis=0), axis=1)
            s = np.concatenate([[0], np.cumsum(d)])
            L = s[-1]
            n = max(2, int(math.ceil(L / step)) + 1)
            ss = np.linspace(0, L, n)
            res = np.stack([np.interp(ss, s, pts[:, k]) for k in range(3)], 1)
            if allp:
                res, ss = res[1:], ss[1:]
            allp.append(np.column_stack([res, ss + s_acc]))
            marks[name] = (s_acc, s_acc + L)
            s_acc += L
        arr = np.vstack(allp)
        self.P, self.S, self.marks = arr[:, :3], arr[:, 3], marks
        return self

    def s(self, name, frac=0.0):
        a, b = self.marks[name]
        return a + (b - a) * frac

    def at(self, s):
        return V([np.interp(s, self.S, self.P[:, k]) for k in range(3)])

    def between(self, s0, s1):
        if s1 - s0 < 0.5:
            return None
        i0, i1 = np.searchsorted(self.S, s0), np.searchsorted(self.S, s1)
        mid = self.P[i0:i1]
        return np.vstack([self.at(s0)[None], mid, self.at(s1)[None]])

    def nearest(self, p, name=None):
        if name:
            a, b = self.marks[name]
            m = (self.S >= a) & (self.S <= b)
        else:
            m = np.ones(len(self.S), bool)
        idx = np.where(m)[0]
        d = np.linalg.norm(self.P[idx] - V(p), axis=1)
        return float(self.S[idx[np.argmin(d)]])


def _chips():
    rng = np.random.default_rng(11)
    labels = ["87", "7/10", "94%", "B+", "18/20", "A-", "82", "91%", "C+", "45/50", "76", "A",
              "8.5/10", "68%", "B", "89", "92", "3/4", "B-", "71%", "A+", "16/20", "79", "95"]
    on_path = [(-1150, 430, 1900), (-760, -280, 1150), (230, -430, 760), (860, 110, 430), (420, 400, 160),
               (-420, 330, 520)]
    chips = []
    for i, lab in enumerate(labels):
        if i < len(on_path):
            p = hook_xy(on_path[i]) + rng.normal(0, 25, 3)
        else:
            p = V([rng.uniform(-1050, 1050), rng.uniform(-470, 470), rng.uniform(-250, 1100)])
            if abs(p[0]) < 300 and abs(p[1]) < 200:
                p[0] += 520 * np.sign(p[0] if p[0] else 1)
            p = hook_xy(p)
        chips.append(dict(label=lab, pos=p, accent=(i % 4 == 0), born=A["every_mark"] + 0.025 * i,
                          src=i % 5, spin=rng.uniform(-0.4, 0.4)))
    return chips, on_path


def _build_path():
    P = Path()
    chips, on_path = _chips()
    # 1. from depth, threading the marks, into a spiral at the centre
    spiral_c = V([0.0, -20.0, 0.0])
    r0 = 300.0
    sp_start = spiral_c + V([-r0, 0, 0])
    P.add("hook_in", _catmull([hook_xy((-1600, 760, 3300)), *[hook_xy(p) for p in on_path[:5]], hook_xy((40, 300, 60)), sp_start], 50))
    th = np.linspace(math.pi, math.pi + 2.8 * math.pi, 260)
    u = np.linspace(0, 1, 260)
    r = r0 * (1 - u) ** 1.25
    P.add("spiral", np.stack([spiral_c[0] + r * np.cos(th), spiral_c[1] + r * np.sin(th), np.zeros_like(u)], 1))
    # 2. under the wordmark
    icon_c, wm_c, sw, ux0, ux1, uy = lockup(ST1)
    P.add("to_under", _catmull([spiral_c, (spiral_c[0] - 150, 120, -10), (ux0 - 60, uy + 10, -2), (ux0, uy, -2)], 40))
    P.add("under1", _seg((ux0, uy, -2), (ux1, uy, -2), 60))
    # 3. dive into the world, down the syllabus margin, under each grading row
    m_top = pdf(-22, 30, -3)
    P.add("dive", _catmull([(ux1, uy, -2), (ux1 + 260, uy - 60, 500), (1500, -420, 1900),
                            m_top + V([-60, -260, -500]), m_top], 60))
    rows_top = D.PDF_ROW_Y0
    P.add("margin", _seg(m_top, pdf(-22, rows_top - 6, -3), 60))
    pts = [pdf(-22, rows_top - 6, -3)]
    for i in range(5):
        y = rows_top + D.PDF_ROW_H * (i + 1) - 6
        xl, xr = 26, D.PDF_W - 34
        a, b = (xl, xr) if i % 2 == 0 else (xr, xl)
        pts += [pdf(a, y, -3), pdf(b, y, -3)]
    rows = []
    for i in range(len(pts) - 1):
        seg = _seg(pts[i], pts[i + 1], 24)
        rows.append(seg if i == 0 else seg[1:])
    P.add("rows", np.vstack(rows))
    bx, by, bw, bh = D.BAR
    bar0, bar1 = tbl(bx, by + bh / 2, -3), tbl(bx + bw, by + bh / 2, -3)
    P.add("to_bar", _catmull([P.end(), P.end() + V([120, 60, -220]), bar0 + V([-120, 40, -160]), bar0], 40))
    P.add("bar", _seg(bar0, bar1, 60))
    # 4. around Term Test 2's grade box, then around the course average
    by0 = D.ROW_Y0 + 3 * D.ROW_H + 13
    bx0, bx1, by1 = D.COL_GRADE - 81, D.COL_GRADE + 81, by0 + 54
    box0 = tbl(bx0, by0 - 6, -3)
    P.add("to_box", _catmull([bar1, bar1 + V([40, -120, -120]), box0 + V([-120, -40, -100]), box0], 40))
    rr = 14
    loop = []
    corners = [(bx0, by0 - 6), (bx1, by0 - 6), (bx1, by1), (bx0, by1), (bx0, by0 - 6)]
    for i in range(4):
        loop.append(_seg(tbl(*corners[i], -3), tbl(*corners[i + 1], -3), 30)[(1 if i else 0):])
    P.add("box", np.vstack(loop))
    rx, ry, rrad = D.RING
    ring0 = tbl(rx, ry - rrad, -3)
    P.add("to_ring", _catmull([P.end(), P.end() + V([60, -80, -140]), ring0 + V([-90, -30, -120]), ring0], 40))
    ang = np.linspace(-math.pi / 2, -math.pi / 2 + 2 * math.pi * 0.85, 160)
    P.add("ring", np.stack([np.full_like(ang, tbl(rx, ry)[0]) + rrad * np.cos(ang),
                            np.full_like(ang, tbl(rx, ry)[1]) + rrad * np.sin(ang),
                            np.full_like(ang, tbl(rx, ry, -3)[2])], 1))
    # 5. leap to the GPA, underline the digits
    g0, g1 = gpa(210, 300, -3), gpa(570, 300, -3)
    P.add("leap", _catmull([P.end(), P.end() + V([200, -300, -200]), (4300, -1100, 4700), g0 + V([-200, -120, -400]), g0], 60))
    P.add("under_gpa", _seg(g0, g1, 60))
    # 6. the semesters: a rising chart through each term
    pts = [ST5 + V([p[0], p[1], -3]) for p in SEM_PTS]
    c0 = ST5 + V([CHART_IN[0], CHART_IN[1], -3])
    P.add("to_sem", _catmull([g1, (6500, -520, 6900), (7150, -60, 8350), c0 + V([-380, -10, -60]), c0], 60))
    P.add("chart", _catmull([c0, *pts, ST5 + V([CHART_OUT[0], CHART_OUT[1], -3])], 60))
    # 7. the tagline baseline
    w2 = D.text_w("one calm semester.", TAG, 750)
    t0, t1 = ST6 + V([-w2 / 2, tag_y(176), -3]), ST6 + V([w2 / 2, tag_y(176), -3])
    P.add("to_type", _catmull([P.end(), P.end() + V([300, -100, 400]), (10200, -500, 10800), t0 + V([-300, 160, -400]), t0], 60))
    P.add("under2", _seg(t0, t1, 80))
    # 8. under the wordmark, again
    icon_c, wm_c, sw, hx0, hx1, hy = lockup(ST6)
    P.add("to_hero", _catmull([t1, t1 + V([60, 80, -20]), (ST6[0], ST6[1] + 260, ST6[2] - 10), (hx0 - 60, hy + 30, ST6[2] - 3), (hx0, hy, ST6[2] - 3)], 50))
    P.add("under_hero", _seg((hx0, hy, ST6[2] - 3), (hx1, hy, ST6[2] - 3), 60))
    P.build()
    for c in chips:
        c["s"] = P.nearest(c["pos"], "hook_in")
    sem_s = [P.nearest(p, "chart") for p in pts]
    return P, chips, sem_s


_STATE = {}


def state():
    if not _STATE:
        P, chips, sem_s = _build_path()
        _STATE.update(path=P, chips=chips, sem_s=sem_s)
    return _STATE


# ---- keyframed curves ---------------------------------------------------------

EASES = {"io": ease_io, "lin": lambda x: x, "in": ease_in, "out": ease_out, "site": ease_site}


def keyed(keys, t, value):
    """keys: list of (time, *args, ease). value(*args) -> float. Ease applies
    to the segment that starts at that key."""
    if t <= keys[0][0]:
        return value(*keys[0][1:-1])
    for k0, k1 in zip(keys, keys[1:]):
        if t <= k1[0]:
            u = EASES[k0[-1]](prog(t, k0[0], k1[0]))
            return lerp(value(*k0[1:-1]), value(*k1[1:-1]), u)
    return value(*keys[-1][1:-1])


HEAD = [
    (0.00, "hook_in", 0.0, "lin"),
    (2.70, "hook_in", 0.0, "in"),
    (3.06, "hook_in", 1.0, "lin"),
    (3.30, "spiral", 1.0, "io"),
    (3.86, "spiral", 1.0, "in"),
    (4.02, "to_under", 1.0, "io"),
    (4.40, "under1", 1.0, "io"),
    (4.48, "under1", 1.0, "in"),
    (5.12, "dive", 1.0, "io"),
    (5.28, "margin", 0.0, "io"),
    (5.98, "margin", 1.0, "lin"),
    (6.10, "rows", 0.0, "lin"),
    (6.78, "rows", 1.0, "io"),
    (6.92, "bar", 0.0, "out"),
    (7.34, "bar", 1.0, "io"),
    (7.52, "bar", 1.0, "io"),
    (7.92, "box", 0.0, "lin"),
    (8.40, "box", 1.0, "io"),
    (8.50, "ring", 0.0, "out"),
    (8.75, "ring", 82 / 85, "io"),
    (9.30, "ring", 1.0, "io"),
    (9.50, "ring", 1.0, "io"),
    (10.02, "under_gpa", 0.0, "out"),
    (10.94, "under_gpa", 1.0, "io"),
    (12.85, "under_gpa", 1.0, "io"),
    (13.22, "sem0", 0.0, "lin"),
    (14.00, "sem1", 0.0, "lin"),
    (14.80, "sem2", 0.0, "out"),
    (15.30, "chart", 1.0, "io"),
    (15.95, "chart", 1.0, "io"),
    (16.98, "under2", 0.0, "io"),
    (17.20, "under2", 0.0, "io"),
    (17.95, "under2", 1.0, "io"),
    (18.50, "under2", 1.0, "io"),
    (18.86, "under_hero", 0.0, "io"),
    (18.98, "under_hero", 0.0, "out"),
    (19.48, "under_hero", 1.0, "io"),
    (23.00, "under_hero", 1.0, "io"),
]

TAIL = [
    (0.00, "hook_in", 0.0, "lin"),
    (2.82, "hook_in", 0.0, "in"),
    (3.30, "spiral", 0.0, "lin"),
    (3.46, "spiral", 1.0, "io"),
    (3.86, "spiral", 1.0, "io"),
    (4.14, "under1", 0.0, "io"),
    (4.48, "under1", 0.0, "in"),
    (5.10, "dive", 0.75, "out"),
    (5.30, "margin", 0.0, "io"),
    (6.12, "margin", 0.0, "in"),
    (6.80, "rows", 0.8, "lin"),
    (6.96, "to_bar", 0.9, "out"),
    (7.06, "bar", 0.0, "io"),
    (7.52, "bar", 0.0, "in"),
    (7.88, "to_box", 0.9, "out"),
    (7.96, "box", 0.0, "io"),
    (8.40, "box", 0.0, "io"),
    (8.62, "ring", 0.0, "io"),
    (9.50, "ring", 0.0, "in"),
    (9.95, "leap", 0.8, "out"),
    (10.06, "under_gpa", 0.0, "io"),
    (12.85, "under_gpa", 0.0, "in"),
    (13.24, "to_sem", 0.9, "out"),
    (13.32, "chart", 0.0, "io"),
    (15.95, "chart", 0.0, "in"),
    (16.70, "to_type", 0.9, "out"),
    (16.98, "under2", 0.0, "io"),
    (18.50, "under2", 0.0, "in"),
    (18.80, "under2", 1.0, "io"),
    (18.92, "under_hero", 0.0, "io"),
    (21.00, "under_hero", 0.0, "io"),
    (21.45, "under_hero", 1.0, "io"),
    (23.00, "under_hero", 1.0, "io"),
]


def _sv(P, sem_s):
    def f(name, frac):
        if name.startswith("sem"):
            return sem_s[int(name[3])]
        return P.s(name, frac)
    return f


def head_tail(t):
    st = state()
    f = _sv(st["path"], st["sem_s"])
    h = keyed(HEAD, t, f)
    tl = min(keyed(TAIL, t, f), h)
    return h, tl


def piece_frac(name, s):
    a, b = state()["path"].marks[name]
    return clamp((s - a) / (b - a))


def line_intensity(t):
    i = ep(t, 2.70, 2.82, ease_out)
    i *= 1 - 0.45 * ep(t, 11.20, 11.30) * (1 - ep(t, 12.30, 12.50))
    i *= 1 - ep(t, 18.50, 18.72) * (t < 18.91)
    i += 0.9 * math.exp(-max(0.0, t - 18.91) * 5) * (t >= 18.91)
    return i


# ---- camera -------------------------------------------------------------------

def _cam_keys():
    mid1 = (ST1 + ST2) / 2 + V([0, -260, 0])
    mid2 = tbl(700, 120) * 0.5 + ST3 * 0.5 + V([0, -260, 0])
    mid3 = (ST3 + ST5) / 2 + V([0, -200, 0])
    mid4 = (ST5 + ST6) / 2 + V([0, -180, 0])
    keys = [
        (0.00, ST1, 0.62, 0, 0, 0),
        (0.30, ST1, 0.66, 0, 0, 0),
        (1.30, ST1, 1.10, -3, 1.5, 0),
        (2.60, ST1 + V([0, 0, 120]), 1.30, 3, -1.5, 0),
        (3.30, ST1, 1.08, 1, 0, 0),
        (4.40, ST1, 1.00, 0, 0, 0),
        (4.76, mid1, 0.95, -10, 4, -3),
        (5.10, ST2, 1.05, -7, 3, 0),
        (7.45, ST2 + V([40, 0, 0]), 1.00, -2, 1, 0),
        (7.98, tbl(560, 300), 0.68, 5, -2, 0),
        (8.80, tbl(560, 260), 0.70, 2, -1, 0),
        (9.42, tbl(580, 230), 0.68, 0, 0, 0),
        (9.76, mid2, 0.85, -6, 4, 2),
        (10.12, ST3, 0.92, -4, 2, 0),
        (10.95, ST3, 0.80, 0, 0, 0),
        (12.75, ST3, 0.76, 3, -1, 0),
        (13.08, mid3, 1.05, -6, 4, -2),
        (13.45, ST5, 1.30, -8, 4, 0),
        (15.95, ST5, 1.14, 3, 1.5, 0),
        (16.28, mid4, 1.05, 4, 2, 2),
        (16.62, ST6, 1.00, 0, 0, 0),
        (18.40, ST6, 0.94, 0, 0, 0),
        (18.95, ST6, 1.00, 0, 0, 0),
        (23.00, ST6, 1.05, 0, 0, 0),
    ]
    if not PORTRAIT:
        return keys
    port = {7.98: (tbl(450, 300), 0.92), 8.80: (tbl(450, 250), 0.90), 9.42: (tbl(450, 230), 0.90),
            10.95: (ST3 + V([0, 100, 0]), 0.95), 12.75: (ST3 + V([0, 100, 0]), 0.92),
            10.12: (ST3 + V([0, 80, 0]), 1.0), 13.45: (ST5 + V([0, -200, 0]), 1.25),
            15.95: (ST5 + V([0, -200, 0]), 1.12),
            # wider mid-flight so the line stays in the narrow frame
            4.76: (mid1, 1.7), 9.76: (mid2, 1.6), 13.08: (mid3, 1.7), 16.28: (mid4, 1.7)}
    out = []
    for k in keys:
        if k[0] in port:
            tg, d = port[k[0]]
            k = (k[0], tg, d, k[3] * 0.6, k[4], k[5])
        out.append(k)
    return out


def _pchip(ts, ys, t):
    """Monotone cubic (Fritsch-Carlson) through (ts, ys)."""
    ts, ys = np.asarray(ts, float), np.asarray(ys, float)
    if t <= ts[0]:
        return ys[0]
    if t >= ts[-1]:
        return ys[-1]
    h = np.diff(ts)
    d = np.diff(ys) / h
    m = np.zeros_like(ys)
    for k in range(1, len(ys) - 1):
        if d[k - 1] * d[k] > 0:
            w1, w2 = 2 * h[k] + h[k - 1], h[k] + 2 * h[k - 1]
            m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k])
    i = int(np.searchsorted(ts, t) - 1)
    u = (t - ts[i]) / h[i]
    h00, h10 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u
    h01, h11 = -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
    return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]


CAM_KEYS = None


def camera(t):
    global CAM_KEYS
    if CAM_KEYS is None:
        CAM_KEYS = _cam_keys()
    ks = CAM_KEYS
    ts = [k[0] for k in ks]
    tgt = V([_pchip(ts, [k[1][j] for k in ks], t) for j in range(3)])
    d = math.exp(_pchip(ts, [math.log(k[2]) for k in ks], t)) * F
    yaw = math.radians(_pchip(ts, [k[3] for k in ks], t))
    pitch = math.radians(_pchip(ts, [k[4] for k in ks], t))
    roll = math.radians(_pchip(ts, [k[5] for k in ks], t))
    # hits: slam, drop, GPA lands, hero lands
    sh = 0.0
    for t0, amp in ((0.17, 30), (7.80, 7), (10.94, 7), (18.91, 16)):
        sh += amp * wobble(t - t0, 9.0, 7.0)
    sx = sh * 0.8 + 0.4 * sh * math.sin(t * 61)
    sy = sh
    # a slow handheld drift so nothing is ever perfectly still
    yaw += math.radians(0.35 * math.sin(t * 0.7))
    pitch += math.radians(0.25 * math.sin(t * 0.53 + 1))
    return Camera(tgt, d, yaw, pitch, roll, (sx, sy))


# ---- sprite helpers ----------------------------------------------------------

def spr(tt, center, scale=1.0, sx=1.0, sy=1.0, **kw):
    tex, (w, h) = tt
    return Sprite(tex, tuple(center), (w * scale * sx, h * scale * sy), **kw)


def over(tt, center, scale=1.0, **kw):
    """A sprite that sits on a card face: always drawn after the card."""
    kw.setdefault("z_bias", -60.0)
    return spr(tt, center, scale, **kw)


def pop(t, t0, freq=3.2, damp=0.42):
    return spring(t - t0, freq, damp) if t >= t0 else 0.0


# ---- the film ----------------------------------------------------------------

def build(t):
    st = state()
    P = st["path"]
    cam = camera(t)
    fr = Frame(cam=cam)
    S = fr.sprites
    yawn = math.atan2(cam.R[2][0], cam.R[2][2])
    fr.glow_pos = (0.5 + yawn * 0.5, 0.42)
    head, tail = head_tail(t)
    I = line_intensity(t)

    # ------------------------------------------------------------ S1 hook
    if t < 5.0:
        icon_c, wm_c, sw, ux0, ux1, uy = lockup(ST1)
        # strands of light rushing past
        if t < 0.55:
            rng = np.random.default_rng(5)
            for k in range(42):
                ang = rng.uniform(0, 2 * math.pi)
                rad = rng.uniform(260, 1300)
                z0 = rng.uniform(800, 5200)
                v = rng.uniform(9000, 16000)
                z = z0 - v * t
                L = rng.uniform(500, 1300)
                if z + L < -900:
                    continue
                x, y = rad * math.cos(ang), rad * math.sin(ang) * 0.62
                a = ep(t, 0.0, 0.06) * (1 - ep(t, 0.25, 0.55))
                fr.lights.append(Light(np.array([[x, y, z + L], [x, y, z]]), width=2.2,
                                       color=C.LIGHT if k % 3 else C.ICE, intensity=0.55 * a))
        # the icon: rush, SLAM, squash and stretch, blink, hop out
        if t < 1.55:
            if t < 0.17:
                u = ease_in(prog(t, 0.0, 0.17))
                z = lerp(2600, 0, u)
                sx = sy = 1.0
                sy, sx = 1.18, 0.88
            else:
                z = 0.0
                w = wobble(t - 0.17, 5.5, 6.0)
                sx, sy = 1 + 0.34 * w, 1 - 0.34 * w
            hop = ep(t, 1.10, 1.50, ease_in)
            pos = ST1 + V([0, -hop * 520 + 30 * math.sin(hop * 3), z + hop * 900])
            size = 330
            blink = 1 - 0.85 * math.exp(-((t - 0.86) / 0.045) ** 2)
            op = 1 - ep(t, 1.30, 1.50)
            S.append(spr((D.glow_tex(C.BLUE), (1, 1)), pos + V([0, 0, 2]), size * 3.2, opacity=0.55 * op,
                         additive=True, dof=False))
            S.append(Sprite(D.logo_tex(size), tuple(pos), (size * sx, size * sy * blink), opacity=op))
            if 0.17 <= t < 1.1:
                fr.flash = 0.22 * math.exp(-(t - 0.17) * 16)
            fr.min_sub = 6 if t < 0.4 else 3
        # shards
        if 0.17 <= t < 1.1:
            rng = np.random.default_rng(9)
            for k in range(30):
                dirv = rng.normal(0, 1, 3)
                dirv[2] *= 0.6
                dirv /= np.linalg.norm(dirv)
                sp = rng.uniform(900, 2200)
                dt = t - 0.17
                pos = ST1 + dirv * sp * (1 - math.exp(-dt * 3.2)) / 3.2 * 2.2 + V([0, 260 * dt * dt, 0])
                col = (C.LIGHT, C.BLUE_MID, C.PALE)[k % 3]
                sz = rng.uniform(16, 38)
                S.append(spr((D.shard_tex(col), (40, 40)), pos, sz / 40, opacity=1 - prog(dt, 0.35, 0.9),
                             rot=(dt * rng.uniform(-9, 9), dt * rng.uniform(-9, 9), dt * rng.uniform(-9, 9))))
        # course cards fan out on "course"
        tc = A["course"]
        if tc - 0.05 <= t < 3.6:
            for i, (code, name, pct, kind, p, ry) in enumerate(HOOK_CARDS):
                k = pop(t, tc + 0.05 * i, 2.6, 0.5)
                back = ep(t, 1.6, 3.0)
                gone = ep(t, 2.85 + 0.06 * i, 3.35 + 0.06 * i)
                pos = ST1 + V(p, float) * k + V([0, 0, 300 * back + 200 * gone])
                S.append(spr(D.course_card(code, name, pct, kind), pos, 0.35 + 0.65 * clamp(k, 0, 1.2),
                             rot=(0, math.radians(ry) * k, 0), opacity=clamp(k * 3) * (1 - 0.45 * back) * (1 - gone)))
        # the marks burst on "mark", threaded and collected by the line
        if A["every_mark"] - 0.05 <= t < 3.7:
            for c in st["chips"]:
                if t < c["born"]:
                    continue
                k = pop(t, c["born"], 2.4, 0.55)
                srcp = ST1 + V(HOOK_CARDS[c["src"]][4], float) + V([0, 0, 300 * ep(t, 1.6, 3.0)])
                pos = srcp + (c["pos"] - srcp) * k
                pos = pos + V([0, 12 * math.sin(t * 2.1 + c["spin"] * 9), 0])
                # collected: when the head passes, the chip is pulled into it
                if head >= c["s"] - 1.0 and t >= 2.7:
                    # time the head reached this chip (invert by sampling)
                    tc_ = _head_time(c["s"])
                    u = ep(t, tc_, tc_ + 0.24, ease_in)
                    hp = P.at(head)
                    pos = pos + (hp - pos) * u
                    sc = 1 - u
                else:
                    sc = 1.0
                if sc <= 0.02:
                    continue
                S.append(spr(D.chip_tex(c["label"], c["accent"]), pos, sc * clamp(k, 0, 1.15),
                             rot=(0, c["spin"] * (1 - k) + 0.12 * c["spin"], 0), opacity=clamp(k * 2.5)))
        # the one number that matters
        if 3.2 <= t < 4.2:
            k = pop(t, 3.34, 2.8, 0.45)
            pulse = 1 + 0.08 * wobble(t - A["matters"], 4, 5) + 0.05 * math.exp(-max(0, t - A["matters"]) * 6) * (t > A["matters"])
            out = ep(t, 3.86, 4.10, ease_in)
            pos = ST1 + V([0, -20 - 160 * out, 0 + 500 * out])
            sc = clamp(k, 0, 1.3) * pulse
            S.append(spr((D.glow_tex(C.BLUE), (1, 1)), pos + V([0, 0, 2]), 700 * sc, opacity=0.5 * (1 - out),
                         additive=True, dof=False))
            S.append(spr(D.text_tex("3.71", 300, 800, "#f8fafc"), pos + V([0, 30, 0]), sc, opacity=clamp(k * 2) * (1 - out)))
            S.append(spr(D.text_tex("GPA", 46, 700, C.PALE, 8), pos + V([0, -175, 0]), sc, opacity=clamp(k * 2) * (1 - out)))
        # lock-up: icon pops in, the line reveals the wordmark
        if 3.80 <= t < 5.0:
            k = pop(t, 3.88, 3.0, 0.45)
            lift = ep(t, 4.48, 4.95, ease_in)
            S.append(Sprite(D.logo_tex(ICON_PX), tuple(icon_c + V([0, -40 * lift, 0])),
                            (ICON_PX * k, ICON_PX * k), opacity=clamp(k * 2)))
            fr_ = piece_frac("under1", head)
            if fr_ > 0:
                tt = D.wordmark_tex(WM_SIZE)
                S.append(spr(tt, wm_c, 1.0, crop=(0.0, clamp(0.06 + fr_ * 0.98))))

    # ------------------------------------------------------- S2/S3 syllabus + grades
    if 4.55 <= t < 10.3:
        # the syllabus drops in
        td = A["drop_in"]
        if t >= td - 0.02:
            k = pop(t, td, 2.2, 0.5)
            pc = st2(PDF_C[0], PDF_C[1] - 900 * (1 - k), 0)
            tilt = math.radians(28) * (1 - clamp(k))
            fade_out = ep(t, 7.6, 8.1)
            S.append(spr(D.pdf_page(), pc, 1.0, rot=(tilt, 0, math.radians(-2) * k), opacity=1 - fade_out * 0.6))
            # grading rows: on the page, then lift off and fly into the table
            for i in range(5):
                tl = 6.10 + 0.135 * (i + 1) + 0.02
                u = ep(t, tl, tl + 0.42, ease_io)
                a = pdf(30 + (D.PDF_W - 60) / 2, D.PDF_ROW_Y0 + D.PDF_ROW_H * i + D.PDF_ROW_H / 2, -2)
                a = a + V([0, -900 * (1 - k), 0])
                b = tbl(D.COL_NAME - 10 + 260, D.ROW_Y0 + i * D.ROW_H + D.ROW_H / 2, -2)
                pos = a + (b - a) * u + V([0, -90 * math.sin(math.pi * u), -260 * math.sin(math.pi * u)])
                rot = (math.radians(-14) * math.sin(math.pi * u), math.radians(10) * math.sin(math.pi * u), 0)
                if u < 1:
                    op = 1 - ep(u, 0.35, 0.65, lambda x: x)
                    S.append(over(D.pdf_row(i), pos, 1.0 + 0.06 * math.sin(math.pi * u), rot=rot, opacity=op * (1 - fade_out)))
                if u > 0.35:
                    land = pop(t, tl + 0.42, 4.5, 0.5) if u >= 1 else 1.0
                    S.append(over(D.table_row(i), pos, 1.0 + 0.04 * (1 - clamp(land)) if u >= 1 else 1.0,
                                 rot=rot, opacity=ep(u, 0.35, 0.65, lambda x: x)))
        # the grade page
        k = pop(t, 4.88, 2.4, 0.55)
        tc = tbl(D.TBL_W / 2, D.TBL_H / 2, 0)
        S.append(spr(D.table_card(), tc + V([0, 60 * (1 - clamp(k)), 0]), 0.92 + 0.08 * clamp(k, 0, 1.1),
                     opacity=clamp(k * 2)))
        # weight bar fills with the line
        bf = piece_frac("bar", head) if t > 6.8 else 0.0
        bx, by, bw, bh = D.BAR
        if bf > 0:
            S.append(over(D.bar_fill(), tbl(bx + bw / 2, by + bh / 2, -1.5), crop=(0, bf)))
        total = int(round(bf * 100))
        done = t >= 7.34
        col = C.GREEN if done else C.MUTED
        lab = f"{total}%"
        pk = 1 + 0.25 * wobble(t - 7.34, 4, 6)
        S.append(over(D.text_tex(lab, 22, 700, col), tbl(bx + bw + 52, by + bh / 2 + 2, -1.5), pk, opacity=clamp(k * 2)))
        if done:
            ck = pop(t, 7.34, 4, 0.45)
            S.append(over(_check(), tbl(bx + bw + 104, by + bh / 2, -1.5), clamp(ck, 0, 1.3)))
        # marks land in their boxes on the drop
        marks = [(0, "87", 7.80), (1, "94", 7.92), (2, "72", 8.04)]
        for i, v, t0 in marks:
            if t >= t0:
                kk = pop(t, t0, 4.0, 0.45)
                S.append(over(D.text_tex(v, 24, 700, "#f8fafc"),
                             tbl(D.COL_GRADE, D.ROW_Y0 + i * D.ROW_H + 39, -1.5), clamp(kk, 0, 1.3)))
        # Term Test 2: typed in
        if 7.95 <= t:
            typed = "" if t < 8.18 else ("9" if t < 8.32 else "91")
            y = D.ROW_Y0 + 3 * D.ROW_H + 39
            if typed:
                S.append(over(D.text_tex(typed, 24, 700, "#f8fafc"), tbl(D.COL_GRADE, y, -1.5)))
            if t < 8.7 and (int(t * 4) % 2 == 0 or t < 8.4):
                cx = D.COL_GRADE + D.text_w(typed, 24, 700) / 2 + 4
                S.append(over(_caret(), tbl(cx, y - 2, -1.6)))
        # the average, inside the ring the line draws
        if t >= 8.45:
            rf = piece_frac("ring", head) * 85
            avg = rf if t < 8.76 else lerp(82, 85, ep(t, 8.76, 9.30, ease_io))
            rx, ry, rr = D.RING
            num = D.text_tex(f"{int(avg)}", 34, 800, "#f8fafc") if t < 8.76 else D.odometer(avg, 34, "{:.0f}")
            S.append(over(num, tbl(rx - 9, ry - 6, -1.5)))
            S.append(over(D.text_tex("%", 22, 700, "#f8fafc"), tbl(rx + 25, ry - 6, -1.5)))
            letter = "A-" if t < 9.12 else "A"
            lk = (1 + 0.35 * wobble(t - 9.12, 4, 6)) * clamp(pop(t, 8.72, 4, 0.5), 0, 1.3)
            S.append(over(D.text_tex(letter, 19, 700, C.PALE), tbl(rx, ry + 24, -1.5), lk))

    # --------------------------------------------------------------- S3b/S4 GPA
    if 9.55 <= t < 13.5:
        k = pop(t, 9.70, 2.4, 0.55)
        fl = _flip(t)
        school, scale, val, fmt = fl["state"]
        rot = (fl["angle"], 0, 0)
        S.append(spr(D.gpa_tile(school, scale), ST3, 0.9 + 0.1 * clamp(k, 0, 1.1), rot=rot, opacity=clamp(k * 2)))
        if val is None:
            v = lerp(3.42, 3.71, ep(t, 9.95, 10.94, ease_out))
            tt = D.odometer(v, 210)
        else:
            tt = D.odometer(val, 210, fmt)
        land = 1 + 0.06 * wobble(t - 10.94, 4, 6)
        # the digits live on the tile, so they flip with it
        Rm = _rx(fl["angle"])
        off = Rm @ (gpa(D.GPA_W / 2, 196, -2) - ST3)
        S.append(over(tt, ST3 + off, land * (0.9 + 0.1 * clamp(k, 0, 1.1)), rot=rot, opacity=clamp(k * 2)))
        for j, (lab, val_) in enumerate((("Letter average", "A-"), ("Percent average", "84%"))):
            kk = pop(t, 9.82 + 0.08 * j, 2.4, 0.55)
            x = -1 if j == 0 else 1
            if PORTRAIT:
                sp_ = ST3 + V([x * 185, 345 + 40 * (1 - clamp(kk)), 0])
                S.append(spr(D.side_tile(lab, val_), sp_, opacity=clamp(kk * 2) * 0.9))
            else:
                S.append(spr(D.side_tile(lab, val_), ST3 + V([x * 620, 60 - 40 * (1 - clamp(kk)), 140]),
                             rot=(0, math.radians(-14 * x), 0), opacity=clamp(kk * 2) * 0.9))

    # ------------------------------------------------------------- S5 semesters
    if 12.95 <= t < 16.6:
        sem_t = [13.22, 14.00, 14.80]
        for i, (term, n) in enumerate(SEM_TERMS):
            k = pop(t, 13.0 + 0.07 * i, 2.4, 0.55)
            lit = t >= sem_t[i]
            lk = 1 + 0.06 * wobble(t - sem_t[i], 4, 6) if lit else 1
            fc = ST5 + folder_pos(i) + V([0, 50 * (1 - clamp(k)), 0])
            S.append(spr(D.folder_card(term, n, lit), fc, lk * (0.9 + 0.1 * clamp(k, 0, 1.1)), opacity=clamp(k * 2)))
            # course cards drop into the folder
            for j, (code, pct) in enumerate(SEM_COURSES[i]):
                t0 = sem_t[i] - 0.25 + 0.08 * j
                u = ep(t, t0, t0 + 0.42, ease_in)
                if 0 < u < 1:
                    pos = fc + V([(j - 1) * 120 * (1 - u), -330 * (1 - u), -40])
                    S.append(spr(D.mini_card(code, pct), pos, 1 - 0.45 * u, opacity=ep(u, 0, 0.15, lambda x: x) * (1 - ep(u, 0.8, 1.0, lambda x: x))))
            if lit:
                pk = pop(t, sem_t[i], 3.6, 0.45)
                px, py = SEM_PTS[i]
                pp = ST5 + V([px, py, -2])
                adds = ep(t, 15.32 + 0.06 * i, 15.72 + 0.06 * i, ease_io)
                S.append(over(D.dot_tex(), pp, clamp(pk, 0, 1.3)))
                lp = pp + V([0, -62, -2])
                tgt = ST5 + V([0, SEM_TILE_Y, -4])
                lp = lp + (tgt - lp) * adds
                S.append(over(D.point_label(f"{SEM_GPA[i]:.2f}"), lp, clamp(pk, 0, 1.3) * (1 - 0.6 * adds),
                             opacity=1 - ep(adds, 0.75, 1.0, lambda x: x)))
        if t >= 15.30:
            k = pop(t, 15.30, 2.8, 0.5)
            v = lerp(3.42, 3.58, ep(t, 15.40, 15.90, ease_out))
            S.append(spr(D.cumulative_tile(f"{v:.2f}"), ST5 + V([0, SEM_TILE_Y, -4]), clamp(k, 0, 1.15),
                         opacity=clamp(k * 2) * (1 - ep(t, 16.1, 16.5))))

    # ------------------------------------------------------------ S6 type + S7 hero
    if t >= 15.9:
        gone = ep(t, 18.50, 18.85, ease_in)
        if t < 18.95:
            w1 = D.tagline(0, TAG)
            e_end = D.text_w("Every ", TAG, 750) / w1[1][0]
            r1 = 0.0
            if t >= A["every_grade"]:
                r1 = lerp(0.0, e_end + 0.04, ep(t, A["every_grade"], A["every_grade"] + 0.2))
            if t >= A["grade"]:
                r1 = lerp(e_end + 0.04, 1.0, ep(t, A["grade"], A["grade"] + 0.22))
            rise = 18 * (1 - ep(t, A["every_grade"], A["every_grade"] + 0.4))
            if r1 > 0:
                S.append(spr(w1, ST6 + V([0, tag_y(-88) + rise - 90 * gone, 0]), crop=(0, r1), opacity=1 - gone))
            r2 = piece_frac("under2", head) if t > 16.9 else 0.0
            if r2 > 0:
                w2 = D.tagline(1, TAG)
                pad = (w2[1][0] - D.text_w("one calm semester.", TAG, 750)) / w2[1][0] / 2
                S.append(spr(w2, ST6 + V([0, tag_y(92) - 90 * gone, 0]), crop=(0, clamp(pad + r2 * (1 - 2 * pad) + 0.01)), opacity=1 - gone))
        # hero: the icon drops and lands ON the hit, the line reveals the wordmark
        if t >= 18.55:
            icon_c, wm_c, sw, hx0, hx1, hy = lockup(ST6)
            end = ep(t, 21.0, 21.55, ease_io)
            up = V([0, (-150 if PORTRAIT else -110) * end, 0])
            hit = 18.91
            if t < hit:
                u = ease_in(prog(t, 18.62, hit))
                pos = icon_c + V([0, -900 * (1 - u), 0])
                sx, sy = 0.9, 1.14
                op = clamp(prog(t, 18.62, 18.7))
            else:
                pos = icon_c
                w = wobble(t - hit, 5.0, 6.0)
                sx, sy = 1 + 0.3 * w, 1 - 0.3 * w
                op = 1
            sc = 1 - 0.12 * end
            S.append(spr((D.glow_tex(C.BLUE), (1, 1)), pos + up + V([0, 0, 2]), ICON_PX * 3.0, opacity=0.4 * op,
                         additive=True, dof=False))
            S.append(Sprite(D.logo_tex(ICON_PX), tuple(pos + up + V([0, ICON_PX * (1 - sy) / 2, 0])),
                            (ICON_PX * sx * sc, ICON_PX * sy * sc), opacity=op))
            if t >= 18.9:
                fr_ = piece_frac("under_hero", head)
                if fr_ > 0:
                    S.append(spr(D.wordmark_tex(WM_SIZE), wm_c + up, crop=(0.0, clamp(0.06 + fr_ * 0.98))))
            if t < hit + 0.6:
                fr.flash = max(fr.flash, 0.16 * math.exp(-max(0, t - hit) * 12) * (t >= hit))
            fr.min_sub = max(fr.min_sub, 4 if abs(t - hit) < 0.25 else 1)
            # end card
            if t >= 21.1:
                k1 = pop(t, 21.22, 2.4, 0.6)
                k2 = pop(t, 21.42, 2.4, 0.6)
                S.append(spr(D.text_tex(C.URL, 56, 650, C.PALE), ST6 + V([0, (120 if PORTRAIT else 150) + 30 * (1 - clamp(k1)), 0]),
                             opacity=clamp(k1 * 2)))
                S.append(spr(D.text_tex(C.SIGNATURE, 27, 500, C.MUTED), ST6 + V([0, (198 if PORTRAIT else 232) + 30 * (1 - clamp(k2)), 0]),
                             opacity=clamp(k2 * 2)))
        fr.fade = ep(t, 22.70, 23.0)

    # ------------------------------------------------------------- the line
    hspeed = abs(head_tail(t + 1 / 240)[0] - head) * 240
    fr.min_sub = max(fr.min_sub, int(min(8, 1 + hspeed / 2200)))
    if I > 0.01 and head - tail > 0.5:
        pts = P.between(tail, head)
        spread = 9 * math.sin(math.pi * prog(t, 17.55, 18.35)) if 17.55 < t < 18.35 else 0.0
        moving = abs(head_tail(t + 1 / 120)[0] - head) > 0.6
        if spread > 0.8:
            cols = (C.BLUE_MID, C.VIOLET, C.GREEN, C.LIGHT)
            for j, col in enumerate(cols):
                off = V([0, (j - 1.5) * spread * 1.4, 0])
                fr.lights.append(Light(pts + off, width=4.5, color=col, intensity=I * 0.75, head=moving))
            fr.lights.append(Light(pts, width=4.5, intensity=I * 0.35))
        else:
            fr.lights.append(Light(pts, width=6.0, intensity=I, head=moving))
    elif I > 0.01 and 2.7 < t:
        moving = abs(head_tail(t + 1 / 120)[0] - head) > 0.6
        if moving:
            p = P.at(head)
            fr.lights.append(Light(np.array([p - V([1.5, 0, 0]), p]), width=6.0, intensity=I, head=True))

    fr.focus = cam.dist
    fr.aperture = 1.0 if t > 3.7 else 1.25
    return fr


# ---- small helpers that need module state -----------------------------------

_HEAD_T = None


def _head_time(s):
    """First time the head reaches arc length s (for collecting chips)."""
    global _HEAD_T
    if _HEAD_T is None:
        ts = np.arange(2.6, 3.6, 1 / 240)
        f = _sv(state()["path"], state()["sem_s"])
        hs = np.array([keyed(HEAD, x, f) for x in ts])
        _HEAD_T = (ts, np.maximum.accumulate(hs))
    ts, hs = _HEAD_T
    i = int(np.searchsorted(hs, s))
    return float(ts[min(i, len(ts) - 1)])


@D.cached
def _check():
    cv = D.Canvas(30, 30)
    cv.ellipse(15, 15, 14, 14, C.GREEN, 0.18)
    D.icon(cv, "check", 15, 15, 16, C.GREEN, 2.6)
    return cv.tex(), (30, 30)


@D.cached
def _caret():
    cv = D.Canvas(4, 30)
    cv.rrect(0, 0, 3, 30, 1.5, C.LIGHT)
    return cv.tex(), (4, 30)


def _rx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


FLIPS = [(11.30, ("McMaster University", "12-point scale", 10.4, "{:.1f}")),
         (11.62, ("York University", "9-point scale", 7.9, "{:.1f}")),
         (11.95, ("McGill University", "4.0 scale", 3.70, "{:.2f}")),
         (12.26, ("University of Toronto", "4.0 scale", 3.71, "{:.2f}"))]
BASE_STATE = ("University of Toronto", "4.0 scale", None, None)


def _flip(t):
    """Split-flap style: tip to edge-on, swap, come back with a small settle."""
    state_ = BASE_STATE
    angle = 0.0
    for t0, s in FLIPS:
        half = 0.085
        if t < t0 - half:
            break
        if t < t0:
            angle = math.radians(90) * ease_in(prog(t, t0 - half, t0))
            break
        state_ = s
        angle = -math.radians(90) * (1 - ease_out(prog(t, t0, t0 + half))) + math.radians(6) * wobble(t - t0 - half, 5, 7)
    if state_[0] == "University of Toronto" and t >= 12.26:
        state_ = ("University of Toronto", "4.0 scale", 3.71, "{:.2f}")
    return {"state": state_, "angle": angle}
