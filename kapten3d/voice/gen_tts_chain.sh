#!/bin/bash
# Driver TTS kapten-3d-uji-1 (25 Nov, permintaan contoh Inas): rantai 13 kunci
# ~/workspace/tts-gemini/tts.py (rotasi internal per panggilan). Keluaran PCM
# s16le 24kHz -> dibungkus WAV. Pacing sopan: jeda 30 dtk antar segmen,
# maks 4 percobaan per segmen, tunggu 90 dtk antar percobaan.
cd "$(dirname "$0")"
CHAIN=~/workspace/tts-gemini/tts.py
LOG=tts-kapten-run.log
echo "MULAI $(date '+%F %T %Z')" >> "$LOG"
first=1
for s in s1 s2 s3 s4 s5; do
  if [ -s "$s.wav" ]; then echo "$s SKIP (sudah ada)" | tee -a "$LOG"; continue; fi
  if [ $first -eq 0 ]; then echo "jeda 30 dtk..." >> "$LOG"; sleep 30; fi
  first=0
  ok=0
  for attempt in 1 2 3 4; do
    echo "== $s percobaan $attempt $(date +%T)" >> "$LOG"
    if python3 "$CHAIN" "$(cat $s.txt)" Kore "$s.pcm" >> "$LOG" 2>&1 && [ -s "$s.pcm" ]; then
      ffmpeg -y -v error -f s16le -ar 24000 -ac 1 -i "$s.pcm" "$s.wav"
      rm -f "$s.pcm"
      dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$s.wav")
      echo "$s OK durasi $dur dtk (percobaan $attempt)" | tee -a "$LOG" keys.log
      ok=1; break
    fi
    rm -f "$s.pcm" "$s.wav"
    echo "$s GAGAL percobaan $attempt — tunggu 90 dtk" >> "$LOG"
    [ $attempt -lt 4 ] && sleep 90
  done
  if [ $ok -eq 0 ]; then
    echo "$s TOTAL GAGAL 4 percobaan rantai penuh" | tee -a "$LOG" keys.log
    echo "BERHENTI_DI $s" >> "$LOG"
    exit 2
  fi
done
echo "TTS_SEMUA_SELESAI $(date '+%F %T %Z')" | tee -a "$LOG"
ls -la *.wav >> "$LOG"
