"""Original procedural music for the Reel Agent concept demo.

Both tracks are synthesized from scratch with plain math (no samples, no
third-party audio), so they are original works created for this demo.

  python3 music.py <outdir>
writes music_lofi.wav ("Mellow Lo-fi") and music_acoustic.wav ("Bright Acoustic").
"""
import math
import random
import struct
import sys
import wave

SR = 44100
DUR = 21.0  # a little longer than the 20 s Reel so playback never runs dry
N = int(SR * DUR)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def write_wav(path, left, right):
    peak = max(max(abs(x) for x in left), max(abs(x) for x in right)) or 1.0
    g = 0.85 / peak
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for a, b in zip(left, right):
            frames += struct.pack("<hh", int(max(-1, min(1, a * g)) * 32767), int(max(-1, min(1, b * g)) * 32767))
        w.writeframes(bytes(frames))


def fade(buf, fin=0.6, fout=1.6):
    a, b = int(fin * SR), int(fout * SR)
    for i in range(a):
        buf[i] *= i / a
    for i in range(b):
        buf[N - 1 - i] *= i / b


def lowpass(buf, cutoff):
    rc = 1.0 / (2 * math.pi * cutoff)
    alpha = (1.0 / SR) / (rc + 1.0 / SR)
    y = 0.0
    out = [0.0] * len(buf)
    for i, x in enumerate(buf):
        y += alpha * (x - y)
        out[i] = y
    return out


def add_note(buf, start, length, freq, amp, kind, pan_buf=None):
    s = int(start * SR)
    n = int(length * SR)
    for i in range(n):
        j = s + i
        if j >= N:
            break
        t = i / SR
        if kind == "epiano":
            env = math.exp(-t * 1.6) * min(1.0, t * 80)
            v = (math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(2 * math.pi * freq * 2 * t) * math.exp(-t * 4)
                 + 0.12 * math.sin(2 * math.pi * freq * 3.01 * t) * math.exp(-t * 6))
            # gentle tremolo
            v *= 1 + 0.08 * math.sin(2 * math.pi * 4.2 * t)
        elif kind == "bass":
            env = math.exp(-t * 2.2) * min(1.0, t * 120)
            v = math.sin(2 * math.pi * freq * t) + 0.2 * math.sin(2 * math.pi * freq * 2 * t)
        else:
            raise ValueError(kind)
        buf[j] += v * env * amp


def kick(buf, start, amp=0.9):
    s = int(start * SR)
    for i in range(int(0.35 * SR)):
        j = s + i
        if j >= N:
            break
        t = i / SR
        f = 45 + 70 * math.exp(-t * 30)
        buf[j] += math.sin(2 * math.pi * f * t) * math.exp(-t * 9) * amp


def noise_hit(buf, start, length, decay, amp, rng, hp=True):
    s = int(start * SR)
    prev = 0.0
    for i in range(int(length * SR)):
        j = s + i
        if j >= N:
            break
        t = i / SR
        x = rng.uniform(-1, 1)
        v = x - prev if hp else x
        prev = x
        buf[j] += v * math.exp(-t * decay) * amp


def karplus(buf, start, freq, amp, rng, length=2.2, damp=0.996):
    period = int(SR / freq)
    ring = [rng.uniform(-1, 1) for _ in range(period)]
    s = int(start * SR)
    idx = 0
    for i in range(int(length * SR)):
        j = s + i
        if j >= N:
            break
        cur = ring[idx]
        nxt = ring[(idx + 1) % period]
        ring[idx] = damp * 0.5 * (cur + nxt)
        buf[j] += cur * amp * min(1.0, i / 40)
        idx = (idx + 1) % period


def lofi():
    rng = random.Random(7)
    keys = [0.0] * N
    bass = [0.0] * N
    drums = [0.0] * N
    bpm = 76
    beat = 60 / bpm
    bar = beat * 4
    # Fmaj9 - Em7 - Dm9 - Cmaj7 (MIDI voicings)
    prog = [
        ([53, 57, 60, 64, 67], 41),
        ([52, 55, 59, 62], 40),
        ([50, 53, 57, 60, 64], 38),
        ([48, 52, 55, 59], 36),
    ]
    t = 0.0
    k = 0
    while t < DUR:
        chord, root = prog[k % 4]
        for m, n in enumerate(chord):
            add_note(keys, t + m * 0.018, bar * 1.05, midi(n), 0.16, "epiano")
        # little off-beat re-strike
        for m, n in enumerate(chord[1:]):
            add_note(keys, t + beat * 2.5 + m * 0.012, beat * 1.4, midi(n), 0.07, "epiano")
        add_note(bass, t, beat * 1.8, midi(root), 0.55, "bass")
        add_note(bass, t + beat * 2.5, beat * 1.2, midi(root + 7), 0.35, "bass")
        for b in range(4):
            bt = t + b * beat
            if b in (0, 2) or (b == 3 and k % 2):
                kick(drums, bt + (0.0 if b != 3 else beat * 0.5), 0.75)
            if b in (1, 3):
                noise_hit(drums, bt + 0.012, 0.25, 22, 0.22, rng, hp=False)
            for h in range(2):
                swing = 0.0 if h == 0 else beat * 0.56
                noise_hit(drums, bt + swing, 0.05, 90, 0.10 if h == 0 else 0.06, rng)
        t += bar
        k += 1
    keys = lowpass(keys, 2600)
    drums = lowpass(drums, 6000)
    crackle = [0.0] * N
    hiss_prev = 0.0
    for i in range(N):
        hiss_prev = 0.97 * hiss_prev + 0.03 * rng.uniform(-1, 1)
        crackle[i] = hiss_prev * 0.05
        if rng.random() < 0.00035:
            crackle[i] += rng.uniform(-0.35, 0.35)
    L = [0.0] * N
    R = [0.0] * N
    for i in range(N):
        wob = 1 + 0.004 * math.sin(2 * math.pi * 0.3 * i / SR)
        L[i] = keys[i] * 0.9 * wob + bass[i] + drums[i] + crackle[i]
        R[i] = keys[i] * 1.0 + bass[i] + drums[i] * 0.9 + crackle[i] * 0.8
    fade(L)
    fade(R)
    return L, R


def acoustic():
    rng = random.Random(11)
    gtr_l = [0.0] * N
    gtr_r = [0.0] * N
    perc = [0.0] * N
    bass = [0.0] * N
    bpm = 98
    beat = 60 / bpm
    bar = beat * 4
    # G - D/F# - Em - C  arpeggios, bright and open
    prog = [
        ([43, 50, 55, 59, 62, 67], 43),
        ([42, 50, 54, 57, 62, 66], 42),
        ([40, 47, 52, 55, 59, 64], 40),
        ([36, 48, 52, 55, 60, 64], 36),
    ]
    pattern = [0, 3, 2, 4, 1, 5, 3, 4]
    t = 0.0
    k = 0
    while t < DUR:
        chord, root = prog[k % 4]
        for e, si in enumerate(pattern):
            st = t + e * beat / 2
            target = gtr_l if e % 2 == 0 else gtr_r
            karplus(target, st, midi(chord[si]), 0.32, rng)
        add_note(bass, t, beat * 2, midi(root), 0.35, "bass")
        add_note(bass, t + beat * 2, beat * 2, midi(root + 12 if root < 40 else root), 0.25, "bass")
        for b in range(8):
            noise_hit(perc, t + b * beat / 2, 0.08, 45, 0.09 if b % 2 else 0.05, rng)
        for b in (1, 3):
            noise_hit(perc, t + b * beat, 0.12, 30, 0.08, rng)
        t += bar
        k += 1
    L = [0.0] * N
    R = [0.0] * N
    for i in range(N):
        L[i] = gtr_l[i] + gtr_r[i] * 0.45 + bass[i] + perc[i] * 0.8
        R[i] = gtr_r[i] + gtr_l[i] * 0.45 + bass[i] + perc[i]
    fade(L)
    fade(R)
    return L, R


if __name__ == "__main__":
    out = sys.argv[1]
    write_wav(f"{out}/music_lofi.wav", *lofi())
    write_wav(f"{out}/music_acoustic.wav", *acoustic())
    print("ok")
