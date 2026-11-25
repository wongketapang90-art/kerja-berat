#!/usr/bin/env python3
"""Mix voice.wav + music.wav -> audio/mix.wav at -14 LUFS integrated.
Music is ducked under speech (gain from voice RMS envelope). Pure ffmpeg+python, no noise sources.
"""
import subprocess, json, sys, os
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_sr, _v = wavfile.read(os.path.join(ROOT, "voice", "voice.wav")); voice = _v.astype("float32") / 32768.0
_sr2, _m = wavfile.read(os.path.join(ROOT, "audio", "music.wav")); music = _m.astype("float32") / 32768.0
if voice.ndim > 1: voice = voice[:, 0]
if music.ndim > 1: music = music[:, 0]
n = len(voice)
music = np.resize(music, n) if len(music) < n else music[:n]

# ducking envelope: voice RMS in 30 ms windows, smoothed; music gain 0.32 idle -> 0.13 under speech
w = 1440
rms = np.sqrt(np.convolve(voice ** 2, np.ones(w) / w, mode="same") + 1e-9)
act = np.clip((rms - 0.015) / 0.05, 0, 1)
k = np.ones(4800) / 4800
act_s = np.convolve(act, k, mode="same")
gain = 0.32 - 0.19 * act_s
mix = voice + music * gain

tmp = os.path.join(ROOT, "audio", "mix_raw.wav")
wavfile.write(tmp, 48000, (np.clip(mix, -1, 1) * 32767).astype("int16"))

def measure(path):
    out = subprocess.run(["ffmpeg", "-i", path, "-af",
                          "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    j = json.loads(out[out.rindex("{"):out.rindex("}") + 1])
    return float(j["input_i"]), float(j["input_tp"])

i0, tp0 = measure(tmp)
adj = -14.0 - i0
mixp = os.path.join(ROOT, "audio", "mix.wav")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-af",
                f"volume={adj:.2f}dB,alimiter=limit=0.7:level=false",
                "-ar", "48000", mixp], check=True)
for _ in range(2):
    ii, _tp = measure(mixp)
    d = -14.0 - ii
    if abs(d) < 0.25: break
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mixp, "-af",
                    f"volume={d:.2f}dB,alimiter=limit=0.7:level=false",
                    "-ar", "48000", mixp + ".t.wav"], check=True)
    os.replace(mixp + ".t.wav", mixp)
i1, tp1 = measure(os.path.join(ROOT, "audio", "mix.wav"))
print(f"pre {i0:.2f} LUFS tp {tp0:.2f} | gain {adj:+.2f} dB | final {i1:.2f} LUFS tp {tp1:.2f}")
assert abs(i1 + 14.0) <= 1.0, "loudness out of tolerance"
assert tp1 <= -0.5, "true peak too hot"
