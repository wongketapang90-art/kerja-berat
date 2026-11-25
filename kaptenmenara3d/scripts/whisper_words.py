import sys, json
from faster_whisper import WhisperModel
path, out = sys.argv[1], sys.argv[2]
m = WhisperModel("base", device="cpu", compute_type="int8")
segs, _ = m.transcribe(path, language="id", word_timestamps=True, vad_filter=False)
words = []
for s in segs:
    for w in (s.words or []):
        words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
json.dump({"words": words}, open(out, "w"), ensure_ascii=False, indent=1)
print("words:", len(words))
print(" ".join(w["word"] for w in words))
