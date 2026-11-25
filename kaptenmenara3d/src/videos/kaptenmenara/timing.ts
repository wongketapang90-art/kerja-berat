// BUKTI LANSKAP (proof) — bukan timing episode.
// TOTAL_FRAMES tetap 900 (30 detik @30fps) untuk render bukti komposisi
// KaptenMenara. Pada produksi episode panjang sungguhan, berkas ini diganti
// hasil scripts/make_timing.py dari audio final (pola yang sama seperti
// BimaMenara): SEG per segmen narasi + CAPTIONS frasa 2-4 kata.
// CAPTIONS di bawah hanya contoh 3 frasa untuk membuktikan tata letak
// caption lanskap (margin samping 160, bawah 54, fontSize 54).
export const FPS = 30;
export const TOTAL_FRAMES = 900;
export interface Caption { a: number; b: number; text: string }
export const CAPTIONS: Caption[] = [
  { a: 12, b: 140, text: "Warga Kota Mainan panik!" },
  { a: 312, b: 442, text: "Serahkan pada Kapten!" },
  { a: 612, b: 742, text: "Kucingnya cuma menjilat kaki" },
];
