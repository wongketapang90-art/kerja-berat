#!/usr/bin/env python3
"""Gentle CLEAN music bed: pure sine-family tones only (music-box arpeggio + soft pad).
No noise sources anywhere -> cannot crackle. Output: audio/music.wav (48 kHz mono float->16bit),
length = argv[1] seconds. Mix/mastering happens in mix.py.
"""
import numpy as np, sys, wave, struct

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 62.0
N = int(SR * DUR)
t = np.arange(N) / SR
out = np.zeros(N)

def note(freq, start, dur, gain=0.16, decay=2.6):
    i0 = int(start * SR); i1 = min(N, int((start + dur) * SR))
    if i0 >= N: return
    tt = np.arange(i1 - i0) / SR
    env = np.exp(-decay * tt) * np.minimum(1.0, tt / 0.012)
    tone = (np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(2 * np.pi * freq * 2 * tt)
            + 0.12 * np.sin(2 * np.pi * freq * 3 * tt))
    out[i0:i1] += gain * env * tone

def pad(freqs, start, dur, gain=0.05):
    i0 = int(start * SR); i1 = min(N, int((start + dur) * SR))
    if i0 >= N: return
    tt = np.arange(i1 - i0) / SR
    env = np.minimum(1.0, tt / 1.2) * np.minimum(1.0, (dur - tt) / 1.2)
    s = np.zeros_like(tt)
    for f in freqs:
        s += np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 1.003 * tt)
    out[i0:i1] += gain * env * s / len(freqs)

# Chord loop: C - G - Am - F (each 4 s), music-box arpeggio + sparse melody
CHORDS = [
    [261.63, 329.63, 392.00],   # C
    [196.00, 246.94, 293.66],   # G
    [220.00, 261.63, 329.63],   # Am
    [174.61, 220.00, 261.63],   # F
]
MEL = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.00,
       493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440.00]
bar = 4.0
nbars = int(DUR / bar) + 1
for b in range(nbars):
    ch = CHORDS[b % 4]
    pad([f / 2 for f in ch], b * bar, bar + 0.3, gain=0.055)
    for k in range(8):  # eighth-note arpeggio, music-box register
        f = ch[k % 3] * (2 if k % 2 else 1)
        note(f, b * bar + k * 0.5, 0.9, gain=0.10)
    m = MEL[b % len(MEL)]
    note(m, b * bar + 0.25, 1.4, gain=0.075)
    note(MEL[(b + 4) % len(MEL)] / 1.0, b * bar + 2.25, 1.4, gain=0.06)

# global gentle fade in/out
fade = int(SR * 0.8)
out[:fade] *= np.linspace(0, 1, fade)
out[-fade:] *= np.linspace(1, 0, fade)
peak = np.max(np.abs(out))
out *= (0.5 / peak) if peak > 0 else 1.0
pcm = (out * 32767).astype(np.int16)
with wave.open("audio/music.wav", "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes(pcm.tobytes())
print(f"music.wav {DUR:.1f}s peak {peak:.3f}")
