"""The camera, the compositor and the line of light.

Every frame is a list of flat sprites (RGBA textures on planes in 3D) plus a
few 3D polylines of light. Sprites are warped onto the screen through a real
perspective camera, blurred by depth of field, composited back to front, and
the light is added on top with a multi-radius glow.
"""
import math
from dataclasses import dataclass, field

import cv2
import numpy as np

from config import F, LW, LH, rgb01, STAGE, ICE, LIGHT, BLUE, PALE

NEAR = 40.0


# ---- camera ---------------------------------------------------------------

class Camera:
    def __init__(self, target, dist, yaw=0.0, pitch=0.0, roll=0.0, shake=(0.0, 0.0)):
        target = np.asarray(target, np.float64)
        fwd = np.array([math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch)])
        right = np.cross(fwd, [0.0, -1.0, 0.0])
        right /= np.linalg.norm(right)
        down = np.cross(fwd, right)
        cr, sr = math.cos(roll), math.sin(roll)
        right, down = cr * right + sr * down, -sr * right + cr * down
        self.pos = target - dist * fwd + right * shake[0] + down * shake[1]
        self.R = np.stack([right, down, fwd])
        self.target = target
        self.dist = dist

    def to_cam(self, P):
        return (np.asarray(P, np.float64) - self.pos) @ self.R.T

    def depth(self, P):
        return float(self.to_cam(np.asarray(P)[None])[0, 2])


class View:
    """Screen mapping for one output resolution."""

    def __init__(self, W, H):
        self.W, self.H = W, H
        # Landscape: 1920 world units across at the home distance. Portrait:
        # 1080 across (the stations are re-laid to fit that width).
        self.f = F * (W / LW) if W >= H else F * (W / 1080)
        self.s = self.f / F

    def project(self, cam, P):
        c = cam.to_cam(P)
        z = c[:, 2]
        zs = np.maximum(z, 1e-3)
        x = self.W / 2 + self.f * c[:, 0] / zs
        y = self.H / 2 + self.f * c[:, 1] / zs
        return np.stack([x, y], 1), z


# ---- sprites --------------------------------------------------------------

def rot_matrix(rx, ry, rz):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Ry @ Rx @ Rz


class Texture:
    """Premultiplied float RGBA with a lazily built mip pyramid."""

    def __init__(self, rgba):
        self.levels = [rgba]

    @property
    def shape(self):
        return self.levels[0].shape

    def level(self, n):
        while len(self.levels) <= n:
            prev = self.levels[-1]
            if min(prev.shape[:2]) < 8:
                return prev
            self.levels.append(cv2.pyrDown(prev))
        return self.levels[n]


@dataclass
class Sprite:
    tex: Texture
    center: tuple
    size: tuple                    # world units (w, h)
    rot: tuple = (0.0, 0.0, 0.0)
    opacity: float = 1.0
    additive: bool = False
    blur: float = 0.0              # extra blur in logical px
    dof: bool = True
    z_bias: float = 0.0            # sort tweak, world units (negative draws later)
    crop: tuple = None             # (x0, x1) fraction of the texture to show (reveal wipes)


@dataclass
class Light:
    pts: np.ndarray                # N x 3 world points
    width: float = 7.0             # world units
    color: str = None              # None = the standard ice/blue line
    intensity: float = 1.0
    head: bool = False


@dataclass
class Frame:
    cam: Camera
    sprites: list = field(default_factory=list)
    lights: list = field(default_factory=list)
    focus: float = None            # focus distance (world units); default = cam.dist
    aperture: float = 1.0
    flash: float = 0.0
    fade: float = 0.0              # fade to stage
    glow_pos: tuple = (0.5, 0.42)
    glow_amt: float = 1.0
    dust: float = 1.0
    min_sub: int = 1


# ---- compositor -----------------------------------------------------------

def _blur(img, sigma):
    if sigma < 0.4:
        return img
    if sigma > 5:
        k = 2 if sigma < 12 else 4
        h, w = img.shape[:2]
        small = cv2.resize(img, (max(1, w // k), max(1, h // k)), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), sigma / k)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(img, (0, 0), sigma)


class Renderer:
    def __init__(self, W, H, seed=7):
        self.view = View(W, H)
        self.W, self.H = W, H
        rng = np.random.default_rng(seed)
        # World dust: a sparse field of motes for parallax and bokeh.
        n = 900
        self.dust = np.stack([rng.uniform(-3000, 15000, n), rng.uniform(-2600, 2600, n),
                              rng.uniform(-2500, 14000, n)], 1)
        self.dust_b = rng.uniform(0.25, 1.0, n)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        nx, ny = (xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)
        self.vignette = np.clip(1.0 - 0.38 * (nx ** 2 * 0.7 + ny ** 2) ** 1.2, 0, 1)[..., None]
        top, bot = rgb01("#0a1020"), rgb01(STAGE)
        g = (yy / H)[..., None]
        self.base = (top * (1 - g) + bot * g).astype(np.float32)
        # A large soft glow we slide around (one dim blue light, never neon).
        gh, gw = H * 2, W * 2
        gy, gx = np.mgrid[0:gh, 0:gw].astype(np.float32)
        d = np.sqrt(((gx - gw / 2) / (W * 0.55)) ** 2 + ((gy - gh / 2) / (H * 0.55)) ** 2)
        self.glow = (np.exp(-d ** 2 * 1.6)[..., None] * rgb01("#123a8a") * 0.30).astype(np.float32)

    # -- public --------------------------------------------------------------

    def render(self, frames, seed):
        """frames: list of Frame (motion-blur subframes). Returns uint8 HxWx3 (RGB)."""
        acc = None
        for fr in frames:
            img = self._render_one(fr)
            acc = img if acc is None else acc + img
        img = acc / len(frames)
        return self._post(img, frames[len(frames) // 2], seed)

    # -- internals -----------------------------------------------------------

    def _render_one(self, fr):
        W, H = self.W, self.H
        cam = fr.cam
        canvas = self.base.copy()
        gx = int(np.clip((1 - fr.glow_pos[0]) * W, 0, W))
        gy = int(np.clip((1 - fr.glow_pos[1]) * H, 0, H))
        canvas += self.glow[gy:gy + H, gx:gx + W] * fr.glow_amt
        light = np.zeros((H, W, 3), np.float32)
        if fr.dust > 0:
            self._dust(light, cam, fr)
        focus = fr.focus if fr.focus is not None else cam.dist
        items = []
        for sp in fr.sprites:
            if sp.opacity <= 0.003:
                continue
            items.append((cam.depth(sp.center) + sp.z_bias, sp))
        items.sort(key=lambda it: -it[0])
        for z, sp in items:
            self._sprite(canvas, light, cam, sp, focus, fr.aperture)
        for li in fr.lights:
            self._light(light, cam, li, focus, fr.aperture)
        canvas += light
        if fr.flash > 0:
            canvas += rgb01(PALE) * fr.flash
        if fr.fade > 0:
            canvas = canvas * (1 - fr.fade) + rgb01(STAGE) * fr.fade
        return canvas

    def _dust(self, light, cam, fr):
        v = self.view
        pts, z = v.project(cam, self.dust)
        ok = (z > 150) & (pts[:, 0] > -60) & (pts[:, 0] < self.W + 60) & (pts[:, 1] > -60) & (pts[:, 1] < self.H + 60)
        if not ok.any():
            return
        hb = np.zeros((self.H // 2, self.W // 2), np.float32)
        focus = fr.focus if fr.focus is not None else cam.dist
        for (x, y), zz, b in zip(pts[ok], z[ok], self.dust_b[ok]):
            coc = abs(zz - focus) / zz * 26 * v.s * fr.aperture
            r = max(0.6, 2.2 * v.f / zz * 0.5 + coc * 0.5)
            a = b * 0.16 * min(1.0, 900 / zz) / max(1.0, r * 0.45) * fr.dust
            cv2.circle(hb, (int(x / 2), int(y / 2)), int(max(1, r)), float(a), -1, cv2.LINE_AA)
        hb = cv2.GaussianBlur(hb, (0, 0), 1.0)
        hb = cv2.resize(hb, (self.W, self.H), interpolation=cv2.INTER_LINEAR)
        light += hb[..., None] * rgb01("#7fb0ff")

    def _sprite(self, canvas, light, cam, sp, focus, aperture):
        v = self.view
        th, tw = sp.tex.shape[:2]
        w, h = sp.size
        x0f, x1f = sp.crop if sp.crop else (0.0, 1.0)
        if x1f <= x0f:
            return
        Rm = rot_matrix(*sp.rot)
        local = np.array([[-w / 2 + w * x0f, -h / 2, 0], [-w / 2 + w * x1f, -h / 2, 0],
                          [-w / 2 + w * x1f, h / 2, 0], [-w / 2 + w * x0f, h / 2, 0]])
        world = np.asarray(sp.center, np.float64) + local @ Rm.T
        dst, z = v.project(cam, world)
        zmin = z.min()
        if zmin < NEAR:
            return
        op = sp.opacity * min(1.0, (zmin - NEAR) / 160.0)
        # Back-facing planes are drawn too (cards flip), the texture just mirrors.
        bx0, by0 = np.floor(dst.min(0)).astype(int)
        bx1, by1 = np.ceil(dst.max(0)).astype(int)
        if bx1 < 0 or by1 < 0 or bx0 > self.W or by0 > self.H:
            return
        zc = float(z.mean())
        coc = 0.0
        if sp.dof:
            coc = abs(zc - focus) / zc * 20.0 * aperture
        sigma = (coc + sp.blur) * v.s
        pad = int(math.ceil(sigma * 3)) + 2
        rx0, ry0 = max(0, bx0 - pad), max(0, by0 - pad)
        rx1, ry1 = min(self.W, bx1 + pad), min(self.H, by1 + pad)
        rw, rh = rx1 - rx0, ry1 - ry0
        if rw <= 1 or rh <= 1:
            return
        # Mip level: compare the texture's pixel width to its on-screen width.
        scr_w = max(np.linalg.norm(dst[1] - dst[0]), np.linalg.norm(dst[2] - dst[3]), 1.0)
        tex_w = tw * (x1f - x0f)
        lvl = int(max(0, math.floor(math.log2(max(1.0, tex_w / scr_w)))))
        tex = sp.tex.level(lvl)
        lh, lw = tex.shape[:2]
        sx0, sx1 = x0f * lw, x1f * lw
        src = np.float32([[sx0, 0], [sx1, 0], [sx1, lh], [sx0, lh]])
        M = cv2.getPerspectiveTransform(src, np.float32(dst - [rx0, ry0]))
        out = cv2.warpPerspective(tex, M, (rw, rh), flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        if sigma > 0.4:
            out = _blur(out, sigma)
        out *= op
        if sp.additive:
            light[ry0:ry1, rx0:rx1] += out[..., :3]
        else:
            a = out[..., 3:4]
            region = canvas[ry0:ry1, rx0:rx1]
            region *= (1 - a)
            region += out[..., :3]

    def _light(self, light, cam, li, focus, aperture):
        v = self.view
        if li.pts is None or len(li.pts) < 2:
            return
        pts, z = v.project(cam, li.pts)
        ok = z > NEAR
        if ok.sum() < 2:
            return
        sel = pts[ok]
        zz = z[ok]
        bx0, by0 = np.floor(sel.min(0)).astype(int)
        bx1, by1 = np.ceil(sel.max(0)).astype(int)
        zmed = float(np.median(zz))
        thick = li.width * v.f / zmed
        coc = abs(zmed - focus) / zmed * 20.0 * aperture * v.s
        pad = int(thick * 6 + 60 * v.s + coc * 3)
        rx0, ry0 = max(0, bx0 - pad), max(0, by0 - pad)
        rx1, ry1 = min(self.W, bx1 + pad), min(self.H, by1 + pad)
        if rx1 - rx0 < 2 or ry1 - ry0 < 2:
            return
        mask = np.zeros((ry1 - ry0, rx1 - rx0), np.uint8)
        # Split into runs in front of the camera, draw in chunks with
        # perspective-correct thickness.
        idx = np.where(ok)[0]
        runs = np.split(idx, np.where(np.diff(idx) != 1)[0] + 1)
        for run in runs:
            for c0 in range(0, len(run) - 1, 6):
                chunk = run[c0:c0 + 7]
                if len(chunk) < 2:
                    continue
                p = ((pts[chunk] - [rx0, ry0]) * 16).astype(np.int32)
                t = max(1, int(round(li.width * v.f / float(z[chunk].mean()))))
                cv2.polylines(mask, [p.reshape(-1, 1, 2)], False, 255, t, cv2.LINE_AA, shift=4)
        m = mask.astype(np.float32) / 255.0
        if li.head and ok[-1]:
            hx, hy = pts[-1] - [rx0, ry0]
            r = max(2, int(thick * 1.25))
            hm = np.zeros_like(m)
            cv2.circle(hm, (int(hx), int(hy)), r, 1.0, -1, cv2.LINE_AA)
            # a short horizontal flare on the head
            cv2.ellipse(hm, (int(hx), int(hy)), (int(r * 5), max(1, r // 3)), 0, 0, 360, 0.7, -1, cv2.LINE_AA)
            m = np.maximum(m, hm)
        if coc > 0.6:
            m = _blur(m, coc * 0.6)
        s = v.s
        g1 = _blur(m, 3.0 * s)
        g2 = _blur(m, 11.0 * s)
        g3 = _blur(m, 34.0 * s)
        I = li.intensity
        if li.color is None:
            col = (rgb01(ICE)[None, None] * m[..., None] * 1.05 +
                   rgb01(LIGHT)[None, None] * g1[..., None] * 1.25 +
                   rgb01(BLUE)[None, None] * g2[..., None] * 1.15 +
                   rgb01(BLUE)[None, None] * g3[..., None] * 0.55)
        else:
            c = rgb01(li.color)
            core = np.minimum(1.0, c * 0.8 + 0.25)
            col = (core[None, None] * m[..., None] * 1.0 + c[None, None] * g1[..., None] * 1.25 +
                   c[None, None] * g2[..., None] * 1.0 + c[None, None] * g3[..., None] * 0.45)
        light[ry0:ry1, rx0:rx1] += col * I

    def _post(self, img, fr, seed):
        H, W = self.H, self.W
        # Bloom from the bright parts only.
        bright = np.maximum(img - 0.74, 0)
        small = cv2.resize(bright, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        b1 = cv2.GaussianBlur(small, (0, 0), 3 * self.view.s * 2)
        b2 = cv2.GaussianBlur(small, (0, 0), 12 * self.view.s * 2)
        bloom = cv2.resize(b1 * 0.5 + b2 * 0.6, (W, H), interpolation=cv2.INTER_LINEAR)
        img = img + bloom
        img *= self.vignette
        # Soft shoulder so highlights roll off instead of clipping.
        img = np.where(img > 0.8, 0.8 + (1 - np.exp(-(img - 0.8) * 3.2)) * 0.2, img)
        rng = np.random.default_rng(seed)
        gh, gw = H // 2, W // 2
        grain = rng.normal(0, 1, (gh, gw)).astype(np.float32)
        grain = cv2.resize(grain, (W, H), interpolation=cv2.INTER_LINEAR)
        img += grain[..., None] * 0.012
        return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
