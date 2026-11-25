#!/bin/bash
# ADAPTASI LOKAL (salinan kerja Messi) — berkas ini TIDAK disertakan dalam paket
# Bos, padahal dirujuk oleh scripts/make_timing.py. Fungsinya merekonstruksi
# langkah yang hilang itu:
#   voice/s{n}.wav (mentah dari TTS, 24 kHz) -> potong hening tepi ->
#   voice/proc/s{n}t.wav (48 kHz mono) -> sambung dengan jeda PERSIS 0,15 dtk
#   antar segmen -> voice/voice.wav
# make_timing.py mengukur durasi proc/*.wav dan mengasumsikan jeda 0,15 dtk,
# jadi angka jeda di sini TIDAK boleh diubah tanpa mengubah GAP di sana.
# Resample ke 48 kHz wajib: audio/mix.py menulis hasil akhir pada 48 kHz dan
# mengasumsikan batang suara juga 48 kHz.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p proc
SEGS="${@:-s1 s2 s3 s4 s5 s6 s7 s8}"
LIST=proc/concat-list.txt
: > "$LIST"
first=1
for s in $SEGS; do
  if [ ! -s "$s.wav" ]; then echo "LEWATI $s (belum ada $s.wav)"; continue; fi
  # potong hening di awal, balik, potong hening (yang kini di awal), balik lagi
  ffmpeg -y -v error -i "$s.wav" -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,aresample=48000" -ac 1 "proc/${s}t.wav"
  if [ $first -eq 0 ]; then
    ffmpeg -y -v error -f lavfi -i anullsrc=r=48000:cl=mono -t 0.15 proc/gap.wav
    echo "file 'gap.wav'" >> "$LIST"
  fi
  first=0
  echo "file '${s}t.wav'" >> "$LIST"
  echo "$s -> proc/${s}t.wav"
done
ffmpeg -y -v error -f concat -safe 0 -i "$LIST" -ac 1 -ar 48000 voice.wav
ffprobe -v error -show_entries format=duration -of csv=p=0 voice.wav | xargs echo "voice.wav durasi (dtk):"
echo "CONCAT_SELESAI"
