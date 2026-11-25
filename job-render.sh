#!/bin/bash
# Kerja-berat job (umum): render SATU komposisi dari SATU folder proyek, lalu
# pecah mp4 menjadi potongan-potongan <40MB di <proyek>/hasil-run/.
#
# Pemilihan target lewat variabel lingkungan (workflow mengisinya dari input
# "Run workflow"; untuk pemakaian manual, ekspor dulu sebelum memanggil):
#   PROJECT_DIR  folder proyek: bima3d | kapten3d | menara3d  (bawaan: bima3d)
#   COMP_ID      id komposisi; kosong = bawaan render_final.mjs proyek itu
#                (BimaTangga / KaptenBlok / BimaMenara)
#   FRAME_RANGE  rentang frame "awal-akhir", mis. 0-149; kosong = render penuh
#
# Catatan: bima3d/render_final.mjs adalah skrip asli paket (tidak membaca
# COMP_ID/FRAME_RANGE — selalu render penuh BimaTangga). kapten3d/ dan
# menara3d/ memakai render_final.mjs berparameter.
set -x
PROJECT_DIR="${PROJECT_DIR:-bima3d}"
cd "$PROJECT_DIR" || exit 1
export REMOTION_TMP=$PWD/remotion-tmp TEMP=$PWD/remotion-tmp TMP=$PWD/remotion-tmp
mkdir -p remotion-tmp out hasil-run public
node --version; npm --version
npm ci --no-audit --no-fund 2>&1 | tail -2 || npm install --no-audit --no-fund 2>&1 | tail -2
node render_final.mjs out/video.mp4 2>&1 | tail -30
ls -la out/
ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/video.mp4 || true
sha256sum out/video.mp4
split -b 40M -d -a 2 out/video.mp4 hasil-run/chunk-
ls -la hasil-run/
echo RENDER_JOB_DONE
