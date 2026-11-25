#!/bin/bash
# Cicil TTS LONG "Lomba Menara Tertinggi": 19 segmen (2 adegan naskah per segmen),
# 1 panggilan/segmen, jeda 65 dtk, rotasi kunci, skip yang sudah ada.
# SUARA: Aoede (keputusan Inas 24 Nov 2026 untuk standar 3D Dunia Bima).
cd "$(dirname "$0")"
TTS=~/workspace/custom-connectors/custom.google-ai-studio/bin/tts.py
KEYS=(custom.google-ai-studio-tts custom.google-ai-studio-tts-3 custom.google-ai-studio-tts-9 custom.google-ai-studio-tts-4 custom.google-ai-studio-tts-5 custom.google-ai-studio-tts-6 custom.google-ai-studio-tts-8 custom.google-ai-studio-tts-2)
FALLBACK="custom.google-ai-studio-tts-3 custom.google-ai-studio-tts-4 custom.google-ai-studio-tts-5 custom.google-ai-studio-tts-6 custom.google-ai-studio-tts-8 custom.google-ai-studio-tts-9 custom.google-ai-studio-tts custom.google-ai-studio-tts-2"
first=1
for i in $(seq 1 19); do
  s="s$i"
  if [ -s "$s.wav" ]; then echo "$s SKIP (sudah ada)"; continue; fi
  if [ $first -eq 0 ]; then echo "jeda 65 dtk..."; sleep 65; fi
  first=0
  ok=0
  primary=${KEYS[$(( (i-1) % 8 ))]}
  for k in $primary $FALLBACK; do
    echo "== $s via $k $(date +%H:%M:%S)"
    if python3 $TTS --text-file $s.txt --out $s.wav --voice Aoede --model gemini-2.5-flash-preview-tts --connector $k --task "bima3d-menara-$s" >> tts.log 2>&1 && [ -s "$s.wav" ]; then
      echo "$s OK via $k" | tee -a keys.log; ok=1; break
    fi
    echo "$s GAGAL via $k — tunggu 125 dtk lalu rotasi" | tee -a keys.log
    rm -f "$s.wav"; sleep 125
  done
  [ $ok -eq 0 ] && echo "$s TOTAL GAGAL semua kunci" | tee -a keys.log
done
echo "TTS_SELESAI $(date +%H:%M:%S)"; ls -la *.wav
