#!/bin/bash
# Cicil TTS: 1 panggilan/segmen, jeda 65 dtk, rotasi kunci, skip yang sudah ada.
# ADAPTASI LOKAL (salinan kerja Messi): path kerja -> folder voice proyek ini;
# konektor tts-7 TIDAK terdaftar di lingkungan Messi, diganti tts-3 (s2) dan
# dibuang dari FALLBACK. Sisanya identik dengan versi paket.
cd "$(dirname "$0")"
TTS=~/workspace/custom-connectors/custom.google-ai-studio/bin/tts.py
declare -A KEY=( [s1]=custom.google-ai-studio-tts [s2]=custom.google-ai-studio-tts-3 [s3]=custom.google-ai-studio-tts-9 [s4]=custom.google-ai-studio-tts-4 [s5]=custom.google-ai-studio-tts-5 [s6]=custom.google-ai-studio-tts-6 [s7]=custom.google-ai-studio-tts-8 [s8]=custom.google-ai-studio-tts-2 )
FALLBACK="custom.google-ai-studio-tts-3 custom.google-ai-studio-tts-4 custom.google-ai-studio-tts-5 custom.google-ai-studio-tts-6 custom.google-ai-studio-tts-8 custom.google-ai-studio-tts-9 custom.google-ai-studio-tts custom.google-ai-studio-tts-2"
first=1
for s in s1 s2 s3 s4 s5 s6 s7 s8; do
  if [ -s "$s.wav" ]; then echo "$s SKIP (sudah ada)"; continue; fi
  if [ $first -eq 0 ]; then echo "jeda 65 dtk..."; sleep 65; fi
  first=0
  ok=0
  for k in ${KEY[$s]} $FALLBACK; do
    echo "== $s via $k $(date +%H:%M:%S)"
    if python3 $TTS --text-file $s.txt --out $s.wav --voice Puck --model gemini-2.5-flash-preview-tts --connector $k --task "bima3d-tangga-$s" >> tts.log 2>&1 && [ -s "$s.wav" ]; then
      echo "$s OK via $k" | tee -a keys.log; ok=1; break
    fi
    echo "$s GAGAL via $k — tunggu 125 dtk lalu rotasi" | tee -a keys.log
    rm -f "$s.wav"; sleep 125
  done
  [ $ok -eq 0 ] && echo "$s TOTAL GAGAL semua kunci" | tee -a keys.log
done
echo "TTS_SELESAI $(date +%H:%M:%S)"; ls -la *.wav
