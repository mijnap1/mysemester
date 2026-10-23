"""Original music and every sound effect, made in code, mixed under the voice.

108 BPM in D major. The drop lands on "Add a mark" (7.80), the breath falls
before "MySemester", and the full chord lands with the logo on 18.91.
Writes out/mix.wav (and stems) at -14 LUFS / -1.25 dBTP.

  python3 film/audio.py
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C  # noqa: E402

SR = 48000
DUR = C.DURATION
N = int(SR * DUR)
rng = np.random.default_rng(21)

BEAT = 60 / 108
ORIGIN = 7.80 - 12 * BEAT          # bar 3 starts on the drop
HIT = ORIGIN + 32 * BEAT           # = 18.91
BREATH = ORIGIN + 31 * BEAT


def bt(n):
    return ORIGIN + n * BEAT


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def track():
    return np.zeros(N, np.float32)


def put(buf, t, sig, gain=1.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    s0 = max(0, -i)
    i0 = max(0, i)
    n = min(len(sig) - s0, N - i0)
    buf[i0:i0 + n] += sig[s0:s0 + n] * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def env_ad(d, a=0.005, k=6.0):
    t = tt(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t * k)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 * 0.95), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, f0, f1, order=2):
    return sosfilt(butter(order, [f0, min(f1, SR / 2 * 0.95)], "band", fs=SR, output="sos"), x)


def noise(d):
    return rng.normal(0, 1, int(d * SR)).astype(np.float32)


# ---- instruments -------------------------------------------------------------

def mallet(f, d=0.9, vel=1.0):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5) +
         0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22) +
         0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 45))
    s *= np.minimum(1, t / 0.002)
    return (s * vel).astype(np.float32)


def felt(f, d=2.2, vel=1.0):
    t = tt(d)
    s = np.zeros_like(t)
    for h, a in ((1, 1.0), (2, 0.42), (3, 0.16), (4, 0.07)):
        s += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0007 * h)) * np.exp(-t * (1.6 + h * 0.9))
    s *= np.minimum(1, t / 0.012)
    return (lp(s, 2600) * vel).astype(np.float32)


def sub(f, d=1.0, vel=1.0):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    e = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.08) * np.exp(-t * 1.2)
    return (s * e * vel).astype(np.float32)


def kick(vel=1.0):
    t = tt(0.42)
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 8.5) + 0.25 * np.exp(-t * 200) * noise(0.42) * 0.3
    return (s * vel).astype(np.float32)


def clap(vel=1.0):
    s = np.zeros(int(0.3 * SR), np.float32)
    for k, off in enumerate((0, 0.009, 0.019)):
        b = bp(noise(0.25), 900, 3200) * env_ad(0.25, 0.001, 30 if k < 2 else 14)
        put_local(s, off, b.astype(np.float32))
    return s * vel * 0.8


def put_local(buf, t, sig):
    i = int(t * SR)
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n]


def shaker(vel=1.0):
    return (hp(noise(0.07), 6000) * env_ad(0.07, 0.003, 70) * vel).astype(np.float32)


# ---- sound effects ------------------------------------------------------------

def whoosh(d=0.6, f0=300, f1=3000, peak=0.6):
    n = noise(d)
    t = tt(d)
    out = np.zeros_like(n)
    steps = 24
    seg = len(n) // steps
    for k in range(steps):
        u = k / steps
        fc = f0 * (f1 / f0) ** u
        lo, hi = fc * 0.6, fc * 1.6
        part = bp(n, max(30, lo), hi)
        a, b = k * seg, (k + 1) * seg if k < steps - 1 else len(n)
        out[a:b] = part[a:b]
    e = np.where(t < peak * d, (t / (peak * d)) ** 2, np.exp(-(t - peak * d) / (d * 0.18)))
    return (out * e).astype(np.float32)


def thump(f=58, d=0.7, drop=0.5):
    t = tt(d)
    fr = f * (1 + drop * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) * np.exp(-t * 5) * np.minimum(1, t / 0.003)).astype(np.float32)


def crack(d=0.25):
    return (bp(noise(d), 1500, 9000) * env_ad(d, 0.0005, 26)).astype(np.float32)


def tick(f=3200, d=0.04):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 160) + 0.4 * hp(noise(d), 4000) * np.exp(-t * 300)
    return s.astype(np.float32)


def pop_(f=700, d=0.12):
    t = tt(d)
    fr = f * (1 + 0.8 * np.exp(-t * 60))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) * np.exp(-t * 30) * np.minimum(1, t / 0.001)).astype(np.float32)


def ping(f, d=0.5):
    t = tt(d)
    return ((np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 8)) *
            np.exp(-t * 7) * np.minimum(1, t / 0.001)).astype(np.float32)


def chime():
    """The MySemester chime: a quick rising D-major bell arpeggio."""
    s = np.zeros(int(1.6 * SR), np.float32)
    for k, m in enumerate((86, 90, 93, 98)):
        put_local(s, 0.055 * k, ping(midi(m), 1.4) * (0.8 if k < 3 else 0.55))
    return s


def paper(d=0.35):
    n = noise(d)
    flutter = 0.5 + 0.5 * np.sin(2 * np.pi * 28 * tt(d) + rng.uniform(0, 6))
    return (bp(n, 600, 5000) * flutter * env_ad(d, 0.02, 9)).astype(np.float32)


def keypress():
    return (tick(2100, 0.05) * 0.6 + thump(220, 0.05, 0.2) * 0.4).astype(np.float32)


def clack():
    s = np.zeros(int(0.12 * SR), np.float32)
    put_local(s, 0.0, tick(1800, 0.05))
    put_local(s, 0.035, tick(1300, 0.05) * 0.8)
    put_local(s, 0.0, (bp(noise(0.06), 400, 2500) * env_ad(0.06, 0.0005, 80)).astype(np.float32))
    return s


def shimmer(d=0.5, f0=2000, f1=7000):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 34 * t)
    e = np.sin(np.pi * t / d) ** 2
    return ((np.sin(ph) * 0.4 + bp(noise(d), 4000, 12000) * 0.6) * trem * e).astype(np.float32)


def gliss(d, f0, f1):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    e = np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.05)
    return (np.sin(ph) * e).astype(np.float32)


# ---- music ------------------------------------------------------------------

D_ = 62  # D4
CHORDS = {  # bar -> (root midi, chord tones as semitone offsets from root)
    -1: (62, (0, 4, 7)), 0: (62, (0, 4, 7)), 1: (59, (0, 3, 7)), 2: (55, (0, 4, 7)),
    3: (62, (0, 4, 7)), 4: (59, (0, 3, 7)), 5: (55, (0, 4, 7)), 6: (57, (0, 4, 7)),
    7: (59, (0, 3, 7)), 8: (62, (0, 4, 7)),
}


def music():
    pl, keys, bass, drums = track(), track(), track(), track()
    # a soft pad swell before the first bar
    t0 = 0.0
    for m in (50, 57, 62, 66):
        put(keys, t0 + 0.12, felt(midi(m), 1.6, 0.25))
    for bar in range(0, 8):
        root, tones = CHORDS[bar]
        start = bt(bar * 4)
        # felt keys: one chord per bar (plus an off-beat push after the drop)
        for m in (root - 12, root + tones[1], root + tones[2], root + 12):
            put(keys, start, felt(midi(m), 2.3, 0.33))
        if bar >= 3:
            for m in (root + tones[1], root + tones[2]):
                put(keys, start + 2.5 * BEAT, felt(midi(m + 12), 1.0, 0.16))
        # round sub: whole bar before the drop, a groove after
        if bar < 3:
            put(bass, start, sub(midi(root - 24), 4 * BEAT, 0.85))
        else:
            for b, d, v in ((0, 1.4, 0.95), (1.5, 0.45, 0.6), (2, 0.9, 0.85), (3.5, 0.45, 0.6)):
                if bar == 7 and start + b * BEAT >= BREATH:
                    continue
                put(bass, start + b * BEAT, sub(midi(root - 24), d * BEAT, v))
        # mallet arpeggio in eighths
        pat = [0, 1, 2, 1, 3, 2, 1, 2] if bar % 2 == 0 else [0, 2, 1, 3, 2, 1, 2, 3]
        notes = [root + 12 + tones[0], root + 12 + tones[1], root + 12 + tones[2], root + 24]
        for k, p in enumerate(pat):
            tk = start + k * BEAT / 2
            if tk >= BREATH:
                continue
            vel = (0.62 if k % 2 == 0 else 0.42) * (1.0 if bar >= 3 else 0.85)
            put(pl, tk, mallet(midi(notes[p]), 0.8, vel))
    # pickup plucks into bar 0
    for k, m in enumerate((74, 78, 81, 86)):
        put(pl, bt(-2) + k * BEAT / 2, mallet(midi(m), 0.8, 0.4 + 0.05 * k))
    # drums from the drop to the breath
    for n in range(12, 31):
        tb = bt(n)
        put(drums, tb, kick(0.9))
        if n % 2 == 1:
            put(drums, tb, clap(0.55))
        for s16 in range(4):
            ts = tb + s16 * BEAT / 4
            if ts < BREATH:
                put(drums, ts, shaker(0.32 if s16 % 2 else 0.18))
    # a lift into the semesters
    put(drums, bt(22) - 0.9, whoosh(0.9, 400, 7000, 0.92) * 0.25)
    # the breath: a reversed swell into the hit
    sw = np.zeros(int(1.4 * SR), np.float32)
    for m in (50, 57, 62, 66, 69, 74):
        put_local(sw, 0, felt(midi(m), 1.4, 0.3))
    sw += (bp(noise(1.4), 500, 6000) * env_ad(1.4, 0.001, 3) * 0.05).astype(np.float32)
    rev = sw[::-1].copy()
    put(keys, HIT - len(rev) / SR, rev * 1.2)
    # the final chord, ringing under the end card
    for m in (38, 45, 50, 57, 62, 66, 69, 74, 78):
        put(keys, HIT, felt(midi(m), 4.2, 0.36))
    for k, m in enumerate((74, 78, 81, 86, 90)):
        put(pl, HIT + 0.03 * k, mallet(midi(m), 1.6, 0.4))
    put(bass, HIT, sub(midi(38), 3.5, 1.0))
    mix = pl * 0.55 + keys * 0.8 + bass * 0.9 + drums * 0.75
    return mix


# ---- sound design ---------------------------------------------------------------

def sfx():
    import scenes
    s = track()
    A = C.A
    # rush and SLAM
    put(s, 0.0, whoosh(0.2, 200, 4000, 0.95), 0.6)
    put(s, 0.17, thump(55, 1.0, 0.8), 1.2)
    put(s, 0.17, crack(0.3), 0.55)
    put(s, 0.17, tick(5000, 0.03), 0.5)
    for k in range(12):
        put(s, 0.19 + rng.uniform(0, 0.45), ping(rng.uniform(2400, 6000), 0.25), 0.07)
    put(s, 0.86, tick(4200, 0.03), 0.18)
    put(s, 1.10, whoosh(0.4, 600, 5000, 0.4), 0.2)
    # cards fan out, marks burst
    for i in range(5):
        put(s, A["course"] + 0.05 * i, whoosh(0.3, 500, 3000, 0.3), 0.14)
    scale = [74, 76, 78, 81, 83, 86, 88, 90]
    for c in scenes.state()["chips"]:
        put(s, c["born"], pop_(midi(scale[int(rng.integers(0, 8))]) / 2, 0.1), 0.14)
    # the line threads the marks
    put(s, 2.70, shimmer(0.7, 1500, 6000), 0.18)
    for c in scenes.state()["chips"]:
        put(s, scenes._head_time(c["s"]) + 0.2, ping(midi(scale[int(rng.integers(0, 8))] + 12), 0.2), 0.05)
    put(s, 3.34, pop_(520, 0.16), 0.35)
    put(s, 3.34, shimmer(0.5, 3000, 8000), 0.12)
    put(s, A["matters"], thump(70, 0.5, 0.3), 0.45)
    put(s, 3.88, pop_(640, 0.14), 0.3)
    put(s, 3.98, shimmer(0.45, 2500, 9000), 0.16)
    # dive into the world, the syllabus drops
    put(s, 4.45, whoosh(0.7, 150, 2500, 0.55), 0.55)
    put(s, A["drop_in"], paper(0.35), 0.45)
    put(s, A["drop_in"] + 0.24, thump(120, 0.25, 0.3), 0.3)
    put(s, 5.28, gliss(0.7, 300, 520) * 0.6 + shimmer(0.7, 1200, 2400) * 0.4, 0.07)
    for i in range(5):
        tl = 6.10 + 0.135 * (i + 1) + 0.02
        put(s, tl, whoosh(0.3, 800, 4000, 0.5), 0.12)
        put(s, tl + 0.42, tick(2600 + 150 * i, 0.04), 0.3)
    put(s, 6.92, gliss(0.42, 420, 880), 0.06)
    put(s, 7.34, chime(), 0.42)
    # the drop: push in, marks land, a mark is typed, the average moves
    put(s, 7.62, whoosh(0.35, 200, 3000, 0.7), 0.35)
    for t0 in (7.80, 7.92, 8.04):
        put(s, t0, tick(3000, 0.04), 0.35)
    for t0 in (8.18, 8.32):
        put(s, t0, keypress(), 0.4)
    put(s, 8.48, gliss(0.28, 500, 900), 0.05)
    for t0 in (8.94, 9.08, 9.25):
        put(s, t0, tick(3600, 0.03), 0.22)
    put(s, 9.12, pop_(800, 0.1), 0.2)
    put(s, 9.30, chime(), 0.38)
    # leap to the GPA, the counter rolls and lands
    put(s, 9.50, whoosh(0.6, 250, 4000, 0.6), 0.4)
    prev = None
    for k in range(int(0.99 * 240)):
        tk = 9.95 + k / 240
        v = 3.42 + 0.29 * C.ease_out(C.prog(tk, 9.95, 10.94))
        cur = int(v * 100)
        if prev is not None and cur != prev:
            put(s, tk, tick(4200, 0.02), 0.07)
        prev = cur
    put(s, 10.94, thump(80, 0.4, 0.4), 0.45)
    put(s, 10.94, ping(midi(93), 0.8), 0.18)
    # split-flap scales
    for t0, _ in scenes.FLIPS:
        put(s, t0 - 0.03, clack(), 0.38)
    # pull back to the semesters
    put(s, 12.92, whoosh(0.6, 200, 3500, 0.6), 0.45)
    for i, t0 in enumerate((13.22, 14.00, 14.80)):
        put(s, t0, gliss(0.12, midi(74 + 4 * i), midi(81 + 4 * i)) * env_ad(0.12, 0.002, 12), 0.18)
        put(s, t0, ping(midi(81 + 4 * i), 0.6), 0.12)
        for j in range(3):
            put(s, t0 - 0.25 + 0.08 * j + 0.42, tick(2200, 0.03), 0.16)
    for k, m in enumerate((86, 90, 93)):
        put(s, 15.32 + 0.07 * k, ping(midi(m), 0.5), 0.13)
    put(s, 15.88, tick(3000, 0.04), 0.2)
    # into the type
    put(s, 15.95, whoosh(0.65, 200, 3000, 0.6), 0.4)
    put(s, A["every_grade"], whoosh(0.25, 1500, 6000, 0.4), 0.08)
    put(s, A["grade"], whoosh(0.25, 1500, 6000, 0.4), 0.08)
    put(s, 17.20, shimmer(0.75, 1800, 5000), 0.12)
    put(s, 17.55, shimmer(0.6, 3000, 9000), 0.1)
    # the hero hit
    put(s, HIT, thump(42, 1.6, 0.9), 1.15)
    put(s, HIT, crack(0.35), 0.3)
    put(s, HIT + 0.07, shimmer(0.5, 2500, 9000), 0.16)
    put(s, 21.22, pop_(600, 0.12), 0.12)
    return s


# ---- mix ----------------------------------------------------------------------

def reverb(x, secs=1.6, wet=0.2):
    t = tt(secs)
    ir = rng.normal(0, 1, len(t)) * np.exp(-t * 4.2)
    ir = lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = fftconvolve(x, ir)[:len(x)]
    return (x * (1 - wet) + y * wet * 0.9).astype(np.float32)


def write_wav(path, x, ch=1):
    x = np.clip(x, -1, 1)
    data = (x * 32767).astype("<i2")
    import wave
    with wave.open(path, "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def loudness(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    js = r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1]
    return json.loads(js)


def to_lufs(x, target, tmp):
    write_wav(tmp, x / max(1e-9, np.max(np.abs(x))) * 0.5)
    m = loudness(tmp)
    cur = float(m["input_i"])
    g = 10 ** ((target - cur) / 20) * 0.5 / max(1e-9, np.max(np.abs(x)))
    return x * g


def load_vo():
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", C.VO, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    v = np.frombuffer(raw, np.float32).copy()
    out = track()
    n = min(len(v), N)
    out[:n] = v[:n]
    return out


def main():
    out = os.path.join(C.ROOT, "out")
    os.makedirs(out, exist_ok=True)
    tmp = os.path.join(out, "_tmp.wav")
    vo = load_vo()
    vo = to_lufs(vo, -16.0, tmp)
    mu = reverb(music(), 1.8, 0.22)
    fx = reverb(sfx(), 1.0, 0.12)
    mu = to_lufs(mu, -27.0, tmp)
    fx = to_lufs(fx, -26.0, tmp)
    # duck the music under the voice (and a touch under the hero cues)
    env = np.abs(vo)
    env = lp(env, 6)
    env = env / max(1e-6, np.percentile(env, 99))
    duck = 1 - 0.35 * np.clip(env, 0, 1)
    mu = mu * duck.astype(np.float32)
    # stereo: music a little wide, voice centred
    wide = np.stack([mu * 0.95 + np.roll(mu, 240) * 0.05, mu * 0.95 + np.roll(mu, -240) * 0.05], 1)
    fx2 = np.stack([fx, fx], 1)
    vo2 = np.stack([vo, vo], 1)
    for name, st in (("stem_vo", vo2), ("stem_music", wide), ("stem_sfx", fx2)):
        write_wav(os.path.join(out, name + ".wav"), st.reshape(-1), 2)
    pre = os.path.join(out, "_premix.wav")
    write_wav(pre, ((vo2 + wide + fx2) * 0.5).reshape(-1), 2)
    m = loudness(pre)
    final = os.path.join(out, "mix.wav")
    af = (f"loudnorm=I=-14:TP=-1.25:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", pre, "-af", af, "-ar", str(SR), final], check=True)
    os.remove(tmp)
    os.remove(pre)
    fm = loudness(final)
    print(f"wrote {final}: {fm['input_i']} LUFS, {fm['input_tp']} dBTP")


if __name__ == "__main__":
    main()
