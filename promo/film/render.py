"""Render the film: frames in parallel, piped to ffmpeg, then muxed with the mix.

  python3 film/render.py --preview                 # 960x540, quick look
  python3 film/render.py --stills 0.2,3.5,7.0      # PNG stills into out/stills
  python3 film/render.py                           # 1920x1080 60 fps final
"""
import argparse
import math
import os
import subprocess
import sys
import time
from multiprocessing import Pool

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C  # noqa: E402

_R = None


def _init(W, H, ts):
    global _R
    import draw
    import scenes
    from engine import Renderer
    draw.set_scale(ts)
    scenes.configure(H > W)
    _R = Renderer(W, H)


def _subframes(t, max_sub):
    import scenes
    from engine import View
    dt = 0.5 / C.FPS                     # 180-degree shutter
    fr = scenes.build(t)
    v = View(1920, 1080)
    c0, c1 = scenes.camera(t - dt / 2), scenes.camera(t + dt / 2)
    tgt = fr.cam.target
    ref = np.array([tgt + d for d in ([0, 0, 0], [500, 0, 0], [-500, 0, 0], [0, 300, 0], [0, -300, 0])])
    p0, _ = v.project(c0, ref)
    p1, _ = v.project(c1, ref)
    disp = float(np.max(np.linalg.norm(p1 - p0, axis=1)))
    n = int(min(max_sub, max(fr.min_sub, math.ceil(disp / 5.0))))
    if n <= 1:
        return [fr]
    return [scenes.build(t + dt * ((k + 0.5) / n - 0.5)) for k in range(n)]


def _frame(args):
    i, max_sub = args
    t = i / C.FPS
    frames = _subframes(t, max_sub)
    return i, _R.render(frames, seed=i).tobytes()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--portrait", action="store_true", help="9:16 re-layout (1080x1920)")
    ap.add_argument("--res", default=None, help="WxH")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=C.DURATION)
    ap.add_argument("--stills", default=None)
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 4) - 1))
    ap.add_argument("--maxsub", type=int, default=None)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    W, H = (960, 540) if a.preview else (1920, 1080)
    if a.portrait:
        W, H = H, W
    if a.res:
        W, H = map(int, a.res.lower().split("x"))
    ts = 1.6 * (W / 1080 if H > W else W / 1920)
    maxsub = a.maxsub or (3 if a.preview else 8)
    outdir = os.path.join(C.ROOT, "out")
    os.makedirs(outdir, exist_ok=True)

    if a.stills:
        from PIL import Image
        _init(W, H, ts)
        sd = os.path.join(outdir, "stills-vertical" if H > W else "stills")
        os.makedirs(sd, exist_ok=True)
        for s in a.stills.split(","):
            t = float(s)
            i = int(round(t * C.FPS))
            _, buf = _frame((i, maxsub))
            p = os.path.join(sd, f"t{t:05.2f}.png")
            Image.frombytes("RGB", (W, H), buf).save(p)
            print(p, flush=True)
        return

    f0, f1 = int(round(a.start * C.FPS)), int(round(a.end * C.FPS))
    tag = ("vertical-" if H > W else "") + ("preview" if a.preview else "master")
    silent = a.out or os.path.join(outdir, f"mysemester-{tag}-silent.mp4")
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(C.FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium" if a.preview else "slow",
                           "-crf", "20" if a.preview else "13", "-pix_fmt", "yuv420p", "-movflags", "+faststart", silent],
                          stdin=subprocess.PIPE)
    t0 = time.time()
    with Pool(a.workers, initializer=_init, initargs=(W, H, ts)) as pool:
        for n, (i, buf) in enumerate(pool.imap(_frame, [(i, maxsub) for i in range(f0, f1)], chunksize=2)):
            ff.stdin.write(buf)
            if n % 30 == 0:
                el = time.time() - t0
                print(f"frame {i}/{f1}  {el:6.1f}s  ~{el / (n + 1) * (f1 - f0 - n - 1):6.0f}s left", flush=True)
    ff.stdin.close()
    ff.wait()
    print("wrote", silent, f"in {time.time() - t0:.0f}s")
    mix = os.path.join(outdir, "mix.wav")
    if os.path.exists(mix) and a.start == 0:
        final = silent.replace("-silent", "")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", mix, "-c:v", "copy", "-c:a", "aac",
                        "-b:a", "256k", "-shortest", final], check=True)
        print("wrote", final)


if __name__ == "__main__":
    main()
