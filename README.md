# kerja-berat — Mesin Render 3D (Bima, Kapten, Lanskap)

Repositori ini adalah salinan susunan render "kerja-berat" milik kami sendiri
(akun `wongketapang90-art`) untuk produksi video 3D kanal **Dunia Bima** dan
**Kapten Blok**. Episode dirender di GitHub Actions, bukan di mesin lokal,
supaya pekerjaan render yang berat tidak membebani komputer produksi — dan
supaya beberapa komposisi bisa dirender **bersamaan** di runner terpisah.

## Tiga proyek, tiga komposisi

| Folder proyek | Komposisi bawaan | Ukuran | Isi |
|---|---|---|---|
| `bima3d/` | `BimaTangga` | 1080×1920 (potret) | Shorts Dunia Bima (jalur asli, tidak berubah) |
| `kapten3d/` | `KaptenBlok` | 1080×1920 (potret) | Shorts Kapten Blok 3D |
| `menara3d/` | `BimaMenara` | 1920×1080 (lanskap) | Video panjang Dunia Bima 3D |
| `kaptenmenara3d/` | `KaptenMenara` | 1920×1080 (lanskap) | Video panjang Kapten Blok 3D |

Setiap folder adalah proyek Remotion 4 + three.js mandiri (dependensi sama,
`package-lock.json` identik) dengan sumber episode aktif di `src/` dan
utilitas audio/suara/timing/QA di subfolder masing-masing.

## Cara kerja

1. **Push** ke `main` yang mengubah `bima3d/**`, `job-kerja-berat.sh`, atau
   workflow ini menjalankan jalur lama persis seperti sebelumnya:
   `job-kerja-berat.sh` merender `BimaTangga` penuh dari `bima3d/`.
2. **Pemicuan manual** (Actions → *Render Bima 3D (kerja-berat)* → *Run
   workflow*) memilih target lewat input:
   - `project` — folder proyek: `bima3d`, `kapten3d`, `menara3d`, atau `kaptenmenara3d`;
   - `comp` — id komposisi (kosongkan untuk bawaan proyek di tabel atas);
   - `frames` — rentang frame `awal-akhir` (mis. `0-149` untuk uji segmen
     pendek; kosongkan untuk render penuh).
   Jalur ini menjalankan `job-render.sh`, skrip umum berparameter
   `PROJECT_DIR` / `COMP_ID` / `FRAME_RANGE`.
3. Hasil `<proyek>/out/video.mp4` dipecah menjadi potongan-potongan di bawah
   40 MB di `<proyek>/hasil-run/`, lalu diterbitkan sebagai **Release**
   bertanda `render-<nomor-run>` (ditambah artifact cadangan), sehingga
   dapat diunduh lewat HTTPS biasa dari repositori publik ini. Catatan
   rilis menyebut proyek, komposisi, dan rentang frame yang dirender.
4. Potongan dirakit kembali berurutan: `cat chunk-00 chunk-01 ... > video.mp4`.

Hasil render adalah video bisu; batang suara (TTS) dibuat dan dimux secara
lokal. Kunci API tidak pernah masuk ke repositori ini.

Untuk video panjang lanskap (±14–15 ribu frame), render dapat dipecah per
rentang frame lewat input `frames` dan potongan frame disambung lokal, atau
dirender penuh dalam satu run (batas waktu workflow 360 menit).

## Isi

- `job-kerja-berat.sh` — skrip pekerjaan render asli (kontrak tetap paket
  standar Bima 3D; dipakai jalur push).
- `job-render.sh` — skrip pekerjaan render umum berparameter (dipakai jalur
  dispatch untuk ketiga proyek).
- `bima3d/`, `kapten3d/`, `menara3d/`, `kaptenmenara3d/` — proyek Remotion per komposisi.
- `.github/workflows/render.yml` — alur GitHub Actions.
