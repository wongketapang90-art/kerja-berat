# kerja-berat — Mesin Render Bima 3D

Repositori ini adalah salinan susunan render "kerja-berat" milik kami sendiri
(akun `wongketapang90-art`) untuk produksi video 3D kanal **Dunia Bima**.
Episode dirender di GitHub Actions, bukan di mesin lokal, supaya pekerjaan
render yang berat tidak membebani komputer produksi.

## Cara kerja

1. Setiap push ke `main` yang mengubah `bima3d/**`, `job-kerja-berat.sh`, atau
   workflow ini — atau pemicuan manual lewat Actions → *Render Bima 3D
   (kerja-berat)* → *Run workflow* — menjalankan render otomatis.
2. Skrip `job-kerja-berat.sh` (dijalankan dari akar repo) masuk ke folder
   `bima3d/`, memasang dependensi (`npm ci`), lalu merender komposisi Remotion
   `BimaTangga` 1080×1920 lewat `render_final.mjs`.
3. Hasil `bima3d/out/video.mp4` dipecah menjadi potongan-potongan di bawah
   40 MB di `bima3d/hasil-run/`, lalu diterbitkan sebagai **Release** bertanda
   `render-<nomor-run>` (ditambah artifact cadangan), sehingga dapat diunduh
   lewat HTTPS biasa dari repositori publik ini.
4. Potongan dirakit kembali berurutan: `cat chunk-00 chunk-01 ... > video.mp4`.

Hasil render adalah video bisu; batang suara (TTS) dibuat dan dimux secara
lokal. Kunci API tidak pernah masuk ke repositori ini.

## Isi

- `job-kerja-berat.sh` — skrip pekerjaan render (kontrak tetap dari paket
  standar Bima 3D).
- `bima3d/` — proyek Remotion 4 + three.js; sumber episode aktif ada di
  `bima3d/src/`, utilitas audio/suara/timing/QA di subfolder masing-masing.
- `.github/workflows/render.yml` — alur GitHub Actions.
