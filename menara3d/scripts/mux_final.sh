#!/bin/bash
# ADAPTASI LOKAL (salinan kerja Messi) — langkah mux TIDAK ada di paket Bos:
# komposisi Remotion tidak memuat komponen <Audio>, jadi hasil render_final.mjs
# adalah video BISU; batang suara audio/mix.wav harus dimux di langkah terpisah
# ini, lalu selisih durasi A/V diperiksa (gerbang QC panduan: < 0,1 dtk).
# Pakai: scripts/mux_final.sh <video-bisu.mp4> <keluaran-final.mp4>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VID="${1:?video bisu wajib diisi}"
OUT="${2:?nama keluaran wajib diisi}"
ffmpeg -y -v error -i "$VID" -i "$ROOT/audio/mix.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest "$OUT"
VD=$(ffprobe -v error -select_streams v:0 -show_entries format=duration -of csv=p=0 "$OUT")
AD=$(ffprobe -v error -select_streams a:0 -show_entries format=duration -of csv=p=0 "$OUT")
python3 - "$VD" "$AD" <<'EOF'
import sys
v, a = float(sys.argv[1]), float(sys.argv[2])
print(f"video {v:.3f}s audio {a:.3f}s selisih {abs(v-a):.3f}s")
assert abs(v - a) < 0.1, "SELISIH A/V MELEBIHI 0,1 DTK"
print("MUX_OK")
EOF
