import * as THREE from "three";
import { SEG, WORDS, TOTAL_FRAMES } from "./timing";
import { MenaraRefs, BUKIT_TOP_Y } from "./world";
import { clamp01, smoother, lerp, lerp3 } from "./vox";

// ============================================================================
// LONG lanskap: "Ayam Kubus yang Tidak Bisa Terbang" (sumber:
// db-panjang-2026-11-30, tayang Senin 30 Nov 2026 19.30 WIB).
// 36 adegan naskah dipetakan ke 36 shot; batas adegan dihitung dari timing
// kata (WORDS) hasil make_timing.py — SCENE_COUNTS = jumlah kata per adegan
// dengan aturan belah-tanda-hubung yang sama seperti scripts/make_timing.py.
// Pola mengikuti episode-panjang-pertama (Lomba Menara): sceneRange(k),
// poseFrame(frame,R,camera), stage() untuk suasana, kamera lanskap fov 40.
// Menara-menara lomba DISEMBUNYIKAN di semua adegan (bukan latar cerita ini);
// sungai/jembatan tidak dipakai. Panggung utama: kandang + ladang (z 0..13)
// dan puncak bukit hijau (pusat 22,-2; permukaan y = 6.3) untuk adegan 22-36.
// ============================================================================

type V3 = [number, number, number];
const frac = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

export const SCENE_COUNTS = [30, 28, 25, 31, 29, 26, 28, 25, 31, 24, 29, 25, 32, 22, 29, 31, 26, 28, 25, 29, 28, 28, 25, 33, 29, 27, 30, 32, 26, 28, 26, 34, 34, 27, 33, 37];
// CATATAN (finisher 26 Nov 2026): angka di atas adalah jumlah kata TERALINASI
// (sesudah belah tanda-hubung, total 1030 — sama dengan WORDS di timing.ts),
// BUKAN jumlah token mentah naskah (1014, scene-map.json). Memakai angka mentah
// menggeser batas adegan sampai 16 kata (±6 dtk) di akhir episode.
const SCENE_START_WORD: number[] = [];
{ let acc = 0; for (const c of SCENE_COUNTS) { SCENE_START_WORD.push(acc); acc += c; } }

export function sceneRange(k: number): { a: number; b: number } {
  // k: 1..36
  if (WORDS.length > 100) {
    const a = k === 1 ? 0 : WORDS[SCENE_START_WORD[k - 1]].start;
    const b = k === 36 ? TOTAL_FRAMES : WORDS[SCENE_START_WORD[k]].start - 1;
    return { a, b };
  }
  // fallback estimasi (sebelum audio final): bagi segmen dua sama rata
  const segIdx = Math.floor((k - 1) / 2) + 1;
  const seg = SEG[`s${segIdx}`] ?? { a: 0, b: TOTAL_FRAMES };
  const mid = Math.round((seg.a + seg.b) / 2);
  return k % 2 === 1 ? { a: seg.a, b: mid } : { a: mid + 1, b: seg.b };
}

// ------------------------------------------------------------ env / suasana
export interface EnvState { dark: number; sunset: number; storm: number }
export const ENV: EnvState = { dark: 0, sunset: 0, storm: 0 };

const SKY_DAY = { top: new THREE.Color("#3f7fd0"), mid: new THREE.Color("#8fbbe8"), bot: new THREE.Color("#d8ecfa") };
const SKY_SUNSET = { top: new THREE.Color("#4a5f9e"), mid: new THREE.Color("#e8906a"), bot: new THREE.Color("#ffd9a8") };
const SKY_STORM = { top: new THREE.Color("#333a45"), mid: new THREE.Color("#59636f"), bot: new THREE.Color("#7c8794") };
const SKY_NIGHT = { top: new THREE.Color("#0b1026"), mid: new THREE.Color("#1c2a4a"), bot: new THREE.Color("#33415e") };
const _c1 = new THREE.Color(); const _c2 = new THREE.Color();
function skyMix(R: MenaraRefs, env: EnvState) {
  const u = R.skyMat.uniforms;
  const mix3 = (day: THREE.Color, sun: THREE.Color, storm: THREE.Color, night: THREE.Color, out: THREE.Color) => {
    out.copy(day).lerp(sun, env.sunset).lerp(storm, env.storm).lerp(night, env.dark);
  };
  mix3(SKY_DAY.top, SKY_SUNSET.top, SKY_STORM.top, SKY_NIGHT.top, u.top.value as THREE.Color);
  mix3(SKY_DAY.mid, SKY_SUNSET.mid, SKY_STORM.mid, SKY_NIGHT.mid, u.mid.value as THREE.Color);
  mix3(SKY_DAY.bot, SKY_SUNSET.bot, SKY_STORM.bot, SKY_NIGHT.bot, u.bot.value as THREE.Color);
  // matahari -> terbenam -> bulan
  const sun = R.sunMesh;
  if (env.dark > 0.5) {
    sun.position.set(170, 200, -320);
    (sun.material as THREE.MeshBasicMaterial).color.set("#dfe8f5");
  } else {
    sun.position.set(lerp(-150, -270, env.sunset), lerp(190, 55, env.sunset), -320);
    _c1.set("#ffd94d").lerp(_c2.set("#ff9a3d"), env.sunset);
    (sun.material as THREE.MeshBasicMaterial).color.copy(_c1);
  }
  R.stars.visible = env.dark > 0.45;
}

// ------------------------------------------------------------ helpers tokoh
function place(g: THREE.Group, x: number, z: number, ry: number, y = 0) {
  g.position.set(x, y, z); g.rotation.set(0, ry, 0);
}
function cheerArms(armL: THREE.Group, armR: THREE.Group, t: number, ph: number) {
  const up = Math.sin(ph) * 0.18;
  armL.rotation.set(-2.9 + up, 0, 0.55); armR.rotation.set(-2.9 - up, 0, -0.55);
  void t;
}

// burung-burung langit terbang melingkar di sekitar satu titik
function birdsCircle(R: MenaraRefs, f: number, cx: number, cy: number, cz: number, rad: number) {
  R.burungLangit.forEach((b, i) => {
    const a = f * 0.045 + i * (Math.PI * 2 / 3);
    b.position.set(cx + Math.cos(a) * rad, cy + Math.sin(f * 0.03 + i * 2) * 0.8, cz + Math.sin(a) * rad);
    b.rotation.y = -a + Math.PI / 2;
    const wL = b.getObjectByName("wingL"), wR = b.getObjectByName("wingR");
    if (wL) wL.rotation.z = Math.sin(f * 0.5 + i) * 0.55;
    if (wR) wR.rotation.z = -Math.sin(f * 0.5 + i) * 0.55;
  });
}

// ------------------------------------------------------------ state panggung
export interface StageOpts {
  env?: Partial<EnvState>;
  slime?: "field" | "hill" | "hidden"; // posisi balok slime
  slimeSquash?: number; // 0..1 -> scale.y 1..0.55 (saat BOING)
  garisKapur?: boolean; spanduk?: boolean; papanSkor?: boolean;
  bunga?: boolean; benderaKecil?: boolean; papanKayu?: boolean;
  burungLangit?: boolean;
}
function stage(R: MenaraRefs, o: StageOpts) {
  // menara lomba selalu disembunyikan di episode ini
  R.towerBimaLayers.forEach((L) => { L.visible = false; });
  R.towerFlag.visible = false;
  R.towerTetanggaLayers.forEach((L) => { L.visible = false; });
  R.towerMonsterLayers.forEach((L) => { L.visible = false; });
  R.towerKelinci.visible = false;
  R.rubbleBima.visible = false; R.rubbleTetangga.visible = false;
  R.bridge.visible = false;
  R.water.position.y = -0.75;
  R.storm.position.x = 160;
  // balok slime
  const sl = o.slime ?? "field";
  R.slimeBlock.visible = sl !== "hidden";
  if (sl === "field") R.slimeBlock.position.set(-4, 0, 2);
  if (sl === "hill") R.slimeBlock.position.set(22, BUKIT_TOP_Y, -2);
  const sq = o.slimeSquash ?? 0;
  R.slimeBlock.scale.set(1 + sq * 0.25, 1 - sq * 0.45, 1 + sq * 0.25);
  // properti aditif
  R.garisKapur.visible = o.garisKapur ?? false;
  R.spanduk.visible = o.spanduk ?? false;
  R.papanSkor.visible = o.papanSkor ?? false;
  R.bunga.visible = o.bunga ?? false;
  R.benderaKecil.visible = o.benderaKecil ?? false;
  R.papanKayu.visible = o.papanKayu ?? false;
  R.burungLangit.forEach((b) => { b.visible = o.burungLangit ?? false; });
  ENV.dark = o.env?.dark ?? 0; ENV.sunset = o.env?.sunset ?? 0; ENV.storm = o.env?.storm ?? 0;
  skyMix(R, ENV);
  R.applyEnv?.(ENV.dark, ENV.sunset, ENV.storm);
}

// ------------------------------------------------------------ reset
function resetAll(R: MenaraRefs) {
  const B = R.bima;
  place(B, -2, 6, 0.4); B.scale.setScalar(1);
  R.armL.rotation.set(0, 0, 0.12); R.armR.rotation.set(0, 0, -0.12);
  R.legL.rotation.set(0, 0, 0); R.legR.rotation.set(0, 0, 0);
  R.bimaHead.rotation.set(0, 0, 0);
  R.headNormal.visible = true; R.headTired.visible = false;
  place(R.tetangga, 8, 8, -0.5);
  R.tArmL.rotation.set(0, 0, 0.12); R.tArmR.rotation.set(0, 0, -0.12);
  R.tLegL.rotation.set(0, 0, 0); R.tLegR.rotation.set(0, 0, 0);
  R.tetanggaHead.rotation.set(0, 0, 0);
  place(R.tetangga2, 11, 10, 0.15);
  R.t2ArmL.rotation.set(0, 0, 0.12); R.t2ArmR.rotation.set(0, 0, -0.12);
  R.tetangga2Head.rotation.set(0, 0, 0);
  place(R.monster, 16, 7, -0.4); R.monster.scale.setScalar(1);
  R.mArmL.rotation.set(0, 0, 0.1); R.mArmR.rotation.set(0, 0, -0.1);
  R.mLegL.rotation.set(0, 0, 0); R.mLegR.rotation.set(0, 0, 0);
  R.monsterHead.rotation.set(0, 0, 0);
  place(R.kelinci, -12, 9, -0.3); R.kelinciHead.rotation.set(0, 0, 0);
  place(R.ayam, -6, 11, 0.1); R.ayamHead.rotation.set(0, 0, 0);
  place(R.bebek, -9, 12.5, -0.1); R.bebekHead.rotation.set(0, 0, 0); // kiri, jauh dari jalur kamera
  place(R.sapi, -6, -28.5, 0); R.sapiHead.rotation.set(0, 0, 0);
  place(R.sapiAnak, -3.8, -28.2, 0.2);
  // Burung Tua: default bertengger di tiang ladang (6, -4), menghadap lapangan
  place(R.burungTua, 6, -4, 0.3, 2.45); R.burungTuaHead.rotation.set(0, 0, 0);
  R.towerBima.rotation.set(0, 0, 0);
  R.towerTetangga.rotation.set(0, 0, 0);
  R.towerKelinci.rotation.set(0, 0, 0);
  R.ladderSmall.visible = false; // tidak ada menara untuk disandari
  stage(R, {});
}

// ------------------------------------------------------------ shot per adegan
interface Shot { pose: (t: number, R: MenaraRefs, f: number) => { pos: V3; look: V3 } }
const cam = (a: V3, b: V3, la: V3, lb: V3) => (t: number) => ({ pos: lerp3(a, b, smoother(t)), look: lerp3(la, lb, smoother(t)) });

const HILL = BUKIT_TOP_Y; // 6.3 — permukaan puncak bukit

export const SCENES: Shot[] = [
  // S1 — hook paradoks: Ayam di puncak tumpukan jerami memandang langit
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.ayam, -8, 11, -2.7, 3.4); // di atas jerami besar
      R.ayamHead.rotation.x = -0.45; // menengadah ke langit
      R.ayamHead.rotation.y = Math.sin(f * 0.04) * 0.25;
      place(R.bima, -5, 13, 0.6);
      R.bimaHead.rotation.x = -0.3;
      R.armL.rotation.z = 0.4;
      return cam([-12, 5.5, 21], [-11, 5, 20], [-7, 3.2, 11], [-6.5, 3, 11])(t);
  } },
  // S2 — Ayam memandangi burung-burung terbang bebas di atas kampung
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", burungLangit: true });
      birdsCircle(R, f, -2, 17, -6, 12);
      place(R.ayam, -6, 11, 0.2);
      R.ayamHead.rotation.x = -0.55; // menatap langit
      R.ayamHead.rotation.y = Math.sin(f * 0.05) * 0.3;
      place(R.bima, -3.5, 12.5, 0.5);
      R.bimaHead.rotation.x = -0.35;
      return cam([2, 4, 26], [0, 4.5, 24], [-4, 4.5, -2], [-5, 5, -4])(t);
  } },
  // S3 — tempat favorit bermimpi: jerami tertinggi, kampung + langit luas
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.ayam, -8, 11, 2.8, 3.4); // membelakangi kamera, memandang kampung
      R.ayamHead.rotation.y = Math.sin(f * 0.045) * 0.4;
      R.ayamHead.rotation.x = -0.15;
      place(R.bebek, -4, 12.5, 0.1);
      place(R.bima, -5, 13.5, -0.5);
      R.bimaHead.rotation.x = -0.25;
      return cam([-18, 7.5, 23], [-17, 7.5, 22], [-7, 3.4, 11], [-5, 4, 2])(t);
  } },
  // S4 — segala cara dicoba: lompat dari pagar, kepak 100x, jatuh lembut
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.ayam, 0, 13.2, Math.PI, 1.0); // di atas pagar (z=13.5), membelakangi
      R.ayam.position.y = 1.0 + Math.abs(Math.sin(f * 0.3)) * 0.7; // lompat-lompat
      R.ayamHead.rotation.x = -0.2 + Math.sin(f * 0.3) * 0.1;
      place(R.bima, -5.5, 9.5, 0.3);
      R.bimaHead.rotation.x = -0.2;
      place(R.bebek, -7, 13, 0.1);
      R.armR.rotation.x = -0.6;
      return cam([6, 3.5, 22], [5, 3.5, 21], [0, 1.8, 12.5], [-1, 1.8, 12])(t);
  } },
  // S5 — Bima: belajar terbang sungguh-sungguh, latihan resmi mulai besok
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.bima, -1, 5, 0.5);
      const point = smoother(frac(t, 0.15, 0.35)) * (1 - smoother(frac(t, 0.85, 1)));
      R.armR.rotation.x = -2.6 * point;
      R.bimaHead.rotation.y = Math.sin(f * 0.05) * 0.1;
      place(R.ayam, 1.5, 6, -2.5); // menghadap Bima, tegak penuh tekad
      R.ayamHead.rotation.x = -0.2;
      R.ayam.position.y = Math.abs(Math.sin(f * 0.2)) * 0.06;
      return cam([3.5, 3.2, 13], [3, 3.2, 12], [0, 1.6, 5.5], [0, 1.6, 5.5])(t);
  } },
  // S6 — hari pertama: kepak secepat mungkin selama satu lagu penuh
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.ayam, 0, 7, 0.2);
      R.ayam.position.y = Math.abs(Math.sin(f * 0.55)) * 0.18; // kepak cepat
      R.ayamHead.rotation.x = -0.15 + Math.sin(f * 0.55) * 0.12;
      place(R.bima, -2.5, 5.5, 0.7);
      R.armR.rotation.x = -2.7; // peluit kecil di tangan
      R.armR.rotation.z = -0.2 + Math.sin(f * 0.2) * 0.1;
      R.bimaHead.rotation.x = -0.15;
      return cam([-4, 3.5, 14], [-3.5, 3.5, 13.5], [0, 1.2, 6.5], [0, 1.2, 6.5])(t);
  } },
  // S7 — garis kapur: lompat, kepak, istirahat
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", garisKapur: true });
      place(R.bima, -4.5, 5.2, 0.3);
      R.bima.scale.y = 0.82; // Bima berjongkok menggambar garis
      R.armR.rotation.x = -1.2 - Math.abs(Math.sin(f * 0.14)) * 0.5;
      const walk = smoother(frac(t, 0.1, 0.9));
      place(R.ayam, lerp(-3, 3, walk), 6.4, 1.5708); // mengikuti garis
      R.ayam.position.y = Math.abs(Math.sin(f * 0.4)) * 0.07;
      return cam([5, 2.6, 13], [4, 2.6, 12], [0, 0.9, 6.4], [0, 0.9, 6.4])(t);
  } },
  // S8 — hari kedua: lompat dari balok rendah, melayang setengah detik lebih lama
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", garisKapur: true });
      place(R.ayam, -3.5, 12.5, 0.2, 1.6); // melompat dari jerami kecil
      R.ayam.position.y = 1.6 + Math.abs(Math.sin(f * 0.35)) * 0.9;
      R.ayamHead.rotation.x = -0.3;
      place(R.bima, -0.5, 10, -0.4);
      place(R.bebek, 4, 13.5, -0.2);
      cheerArms(R.armL, R.armR, t, f * 0.3); // bersorak
      R.bima.position.y = Math.abs(Math.sin(f * 0.3)) * 0.12;
      return cam([-10, 5, 23], [-9, 5, 22], [-2.5, 2.2, 11.5], [-2.5, 2.2, 11.5])(t);
  } },
  // S9 — penonton sore: Kelinci papan skor, Bebek air dingin
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", papanSkor: true });
      place(R.kelinci, 4.8, 11.8, -0.5); // di samping papan skor, sisi kiri agar tidak tertutup
      R.kelinci.position.y = Math.abs(Math.sin(f * 0.3)) * 0.1;
      place(R.bebek, -3.5, 11, -0.2);
      R.bebekHead.rotation.x = 0.2 + Math.sin(f * 0.2) * 0.1;
      place(R.ayam, -1, 8.5, 0.2);
      R.ayamHead.rotation.x = 0.25; // basah kuyup, kepala tertunduk sedikit
      R.ayam.position.y = Math.abs(Math.sin(f * 0.15)) * 0.05;
      place(R.bima, 4, 7, -0.5);
      R.armL.rotation.z = 0.4;
      return cam([7, 4.5, 20], [6, 4.5, 19], [1.5, 1.5, 9.5], [0.5, 1.5, 9.5])(t);
  } },
  // S10 — Monster dan spanduk daun raksasa
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", spanduk: true });
      place(R.monster, 7, 9.5, 2.5); // di depan spanduk, di ladang
      R.mArmL.rotation.x = -2.6; R.mArmR.rotation.x = -2.6; // mengibarkan spanduk
      R.monsterHead.rotation.x = -0.15;
      place(R.ayam, 8, 10, 0.4);
      R.ayam.position.y = Math.abs(Math.sin(f * 0.35)) * 0.2; // melayang sedetik lebih lama
      R.ayamHead.rotation.x = -0.3;
      place(R.bima, 6, 12, -0.6);
      cheerArms(R.armL, R.armR, t, f * 0.28);
      return cam([8, 5.5, 22], [8, 5.5, 21], [8, 2.5, 8.5], [8, 2.5, 8.5])(t);
  } },
  // S11 — dua minggu gagal: Ayam termenung di pagar, matahari terbenam
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", env: { sunset: 0.7 } });
      place(R.ayam, 0, 13.4, Math.PI, 1.0); // duduk di pagar, membelakangi kampung
      R.ayamHead.rotation.x = 0.4; // tertunduk sedih
      R.ayamHead.rotation.y = Math.sin(f * 0.03) * 0.2;
      place(R.bima, -1.5, 13.2, 0.4);
      R.bimaHead.rotation.x = 0.2;
      return cam([6, 3.2, 21], [5, 3.2, 20], [-1, 1.6, 13], [-1, 1.6, 13])(t);
  } },
  // S12 — sayap lelah; jangkrik malam
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", env: { sunset: 0.85 } });
      place(R.ayam, 0, 13.4, Math.PI + 0.3, 1.0);
      R.ayamHead.rotation.x = 0.45;
      R.ayamHead.rotation.y = Math.sin(f * 0.025) * 0.15;
      place(R.bima, -3, 12.8, 0.3, 1.0); // duduk di pagar di sampingnya
      R.bima.scale.y = 0.82;
      R.bimaHead.rotation.x = 0.25;
      return cam([5, 3.2, 20], [4.5, 3.2, 19], [-1, 1.7, 13], [-1, 1.7, 13])(t);
  } },
  // S13 — Bima menghibur: langit bukan bukan untukmu, cari caramu sendiri
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", env: { sunset: 0.5 } });
      place(R.ayam, 0, 13.4, Math.PI, 1.0);
      R.ayamHead.rotation.x = 0.3;
      place(R.bima, -2.2, 12.6, 0.5, 1.0);
      R.bima.scale.y = 0.82;
      R.armL.rotation.z = 0.55; // tangan menenangkan ke arah Ayam
      R.bimaHead.rotation.x = 0.1;
      R.bimaHead.rotation.y = 0.3;
      const lift = smoother(frac(t, 0.6, 0.9)); // Ayam mulai menegak lagi
      R.ayamHead.rotation.x = lerp(0.3, -0.05, lift);
      return cam([-5, 3.5, 21], [-4.5, 3.5, 20], [-1, 1.8, 13], [-1, 1.8, 13])(t);
  } },
  // S14 — menemui Burung Tua di tiang ladang
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.burungTua, 6, -4, 0.3, 2.45); // bertengger
      R.burungTuaHead.rotation.y = Math.sin(f * 0.04) * 0.3;
      R.burungTuaHead.rotation.x = 0.15;
      place(R.bima, 4, 0, 0.4);
      R.bimaHead.rotation.x = -0.4; // menengadah ke Burung Tua
      place(R.tetangga2, 16, 13, 0.5); // menjauh dari kamera
      place(R.ayam, 7.5, 0.5, -0.4);
      R.ayamHead.rotation.x = -0.4;
      return cam([9, 4.5, 10], [8.5, 4.5, 9], [6, 2.8, -3], [6, 2.8, -3.5])(t);
  } },
  // S15 — nasihat Burung Tua, menunjuk ke ladang
  { pose: (t, R, f) => {
      stage(R, { slime: "field" }); // slime sudah terlihat di latar ladang
      place(R.burungTua, 6, -4, -0.9, 2.45); // menghadap ladang
      const point = smoother(frac(t, 0.3, 0.5));
      R.burungTuaHead.rotation.y = lerp(0, -0.9, point); // menunjuk dengan paruh
      R.burungTuaHead.rotation.x = lerp(0.15, 0.35, point);
      place(R.bima, 3.5, -0.5, 0.6);
      R.bimaHead.rotation.x = -0.35;
      place(R.tetangga2, 16, 13, 0.5); // menjauh dari kamera
      place(R.ayam, 8, 0, -0.6);
      R.ayamHead.rotation.x = -0.35;
      return cam([11, 6, 11], [10, 6, 10], [5, 2.4, -2], [4, 2.2, -1.5])(t);
  } },
  // S16 — BALOK SLIME ditemukan di ladang
  { pose: (t, R, f) => {
      stage(R, { slime: "field" });
      place(R.bima, -7.5, 0.5, -1.2);
      R.armR.rotation.x = -2.7; // menunjuk slime
      R.bimaHead.rotation.x = -0.2;
      R.bimaHead.rotation.y = 0.3;
      place(R.ayam, -1.5, 4.5, 2.4); // menatap slime takjub
      R.ayamHead.rotation.x = -0.3;
      R.ayam.position.y = Math.abs(Math.sin(f * 0.2)) * 0.08;
      return cam([-10, 3.2, 10], [-9, 3.2, 9], [-4, 1.4, 2], [-4, 1.4, 2])(t);
  } },
  // S17 — Bima menguji sendiri semalam: terpental sampai atap kandang
  { pose: (t, R, f) => {
      stage(R, { slime: "field" });
      place(R.bima, -4, 2, 0.2, 2); // melambung di atas slime
      R.bima.position.y = 2 + Math.abs(Math.sin(f * 0.25)) * 2.6; // pantulan tinggi
      R.armL.rotation.x = -1.2; R.armR.rotation.x = -1.2;
      R.bimaHead.rotation.x = -0.25;
      place(R.ayam, -1, 5, 2.6); // menonton takjub
      R.ayamHead.rotation.x = -0.45;
      return cam([-11, 6, 12], [-10, 6.5, 11], [-4, 3.5, 2], [-4, 4, 2])(t);
  } },
  // S18 — rencana gila: lompat, pantul, sayap melakukan sisanya
  { pose: (t, R, f) => {
      stage(R, { slime: "field" });
      place(R.bima, -7, 0, -1.0);
      R.armL.rotation.set(0.2, 0, 0.85); R.armR.rotation.set(0.2, 0, -0.85); // tangan di pinggang, yakin
      R.bimaHead.rotation.x = -0.2;
      place(R.ayam, -2.2, 2, 2.8, 2); // berdiri di tepi slime, tegak
      R.ayamHead.rotation.x = -0.35;
      R.ayam.position.y = 2 + Math.abs(Math.sin(f * 0.22)) * 0.1;
      return cam([-8, 3.2, 10], [-7, 3.2, 9.5], [-3.5, 1.8, 2], [-3.5, 1.8, 2])(t);
  } },
  // S19 — latihan memantul: pagar, lalu atap kandang
  { pose: (t, R, f) => {
      stage(R, { slime: "field" });
      place(R.ayam, -4, 2, 0.2, 2); // di atas slime
      const h = lerp(1.0, 4.0, smoother(frac(t, 0.05, 0.9))); // makin tinggi
      R.ayam.position.y = 2 + Math.abs(Math.sin(f * 0.3)) * h;
      R.ayamHead.rotation.x = -0.3;
      place(R.bima, -7.5, 0.5, -1.0);
      R.armR.rotation.x = -2.4; // menghitung pantulan
      place(R.kelinci, -11, 8, 0.3);
      R.kelinci.position.y = Math.abs(Math.sin(f * 0.3)) * 0.12;
      place(R.bebek, 1, 6.5, -0.3);
      return cam([-12, 6, 15], [-11, 6, 14], [-4, 3.5, 2], [-4, 3.5, 2])(t);
  } },
  // S20 — pantulan miring: mendarat di tumpukan jerami, kepala penuh jerami
  { pose: (t, R, f) => {
      stage(R, { slime: "field" });
      // Ayam melengkung dari slime ke jerami besar
      const arc = smoother(frac(t, 0.05, 0.55));
      const p = lerp3([-4, 2.6, 2], [-8, 3.4, 11], arc);
      const ay = arc < 1 ? p[1] + Math.sin(arc * Math.PI) * 2.2 : 3.4;
      place(R.ayam, p[0], p[2], lerp(0.2, -2.7, arc), ay);
      R.ayamHead.rotation.x = 0.5; // kepala penuh jerami
      R.ayamHead.rotation.z = Math.sin(f * 0.2) * 0.15; // mengibas-ngibas
      place(R.bima, -5, 12, 0.5);
      R.bimaHead.rotation.x = -0.3 + Math.sin(f * 0.1) * 0.1; // tertawa
      place(R.kelinci, -10, 13.8, 0.4);
      R.kelinci.position.y = Math.abs(Math.sin(f * 0.35)) * 0.14;
      return cam([-12, 4.5, 19], [-11, 4.5, 18], [-7, 2.8, 11], [-7, 2.8, 11])(t);
  } },
  // S21 — kabar menyebar: HARI TERBANG AYAM di puncak bukit minggu depan
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden" });
      place(R.bima, -2, 6, 0.3);
      cheerArms(R.armL, R.armR, t, f * 0.26);
      place(R.tetangga, 5, 7, -0.4); cheerArms(R.tArmL, R.tArmR, t, f * 0.28);
      place(R.tetangga2, 9, 9, 0.3);
      place(R.monster, 14, 8, -0.5); R.mArmL.rotation.set(-2.8, 0, 0.5); R.mArmR.rotation.set(-2.8, 0, -0.5);
      place(R.ayam, 0, 9, 0.2);
      R.ayam.position.y = Math.abs(Math.sin(f * 0.32)) * 0.15;
      place(R.kelinci, -6, 9.5, 0.4); R.kelinci.position.y = Math.abs(Math.sin(f * 0.3)) * 0.12;
      place(R.bebek, 3, 10.5, -0.2);
      return cam([-2, 7.5, 34], [-2, 7, 32], [0, 2, 5], [0, 2, 6])(t);
  } },
  // S22 — gotong royong: Monster angkut slime ke puncak, bendera, cek angin
  { pose: (t, R, f) => {
      stage(R, { slime: "hidden", benderaKecil: true });
      // Monster di lereng bukit mengangkut slime di atas kepala
      place(R.monster, 16, 4, -0.4, 4); // di anak tangga tengah (y=4), di depan tapak atas — bukan di dalam kotak bukit
      R.mArmL.rotation.x = -2.9; R.mArmR.rotation.x = -2.9; // mengangkat
      R.slimeBlock.visible = true;
      R.slimeBlock.position.set(16, 8.6, 4); // tepat di atas kepala Monster
      R.slimeBlock.scale.set(1.4, 1.4, 1.4); // slime raksasa
      place(R.tetangga, 18.5, -5.5, 0.6, HILL); // memasang bendera (x>=15 = tapak atas)
      R.tArmR.rotation.x = -1.8;
      place(R.bima, 18, 1, -2.2, HILL); // memeriksa arah angin
      R.armR.rotation.x = -2.9;
      R.bimaHead.rotation.x = -0.3;
      return cam([20, 9, 17], [19, 9, 16], [16, 7.5, 2], [16, 7.5, 2])(t);
  } },
  // S23 — bunga ditabur di lintasan lari puncak bukit
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true });
      const scat = (off: number) => smoother(frac(t, off, off + 0.6));
      const pk = lerp3([16, HILL, -3.2], [21, HILL, -1], scat(0.05));
      place(R.kelinci, pk[0], pk[2], 1.5708, HILL); R.kelinci.position.y = HILL + Math.abs(Math.sin(f * 0.4)) * 0.1;
      const pb = lerp3([16.5, HILL, -0.8], [21.5, HILL, -3], scat(0.2));
      place(R.bebek, pb[0], pb[2], 1.5708, HILL); R.bebek.position.y = HILL + Math.abs(Math.sin(f * 0.38)) * 0.08;
      const pa = lerp3([16, HILL, -1], [20.5, HILL, -3.4], scat(0.35));
      place(R.ayam, pa[0], pa[2], 1.5708, HILL); R.ayam.position.y = HILL + Math.abs(Math.sin(f * 0.36)) * 0.08;
      place(R.bima, 24, 1.5, -2.5, HILL);
      R.bimaHead.rotation.x = -0.1;
      return cam([14, 9.5, 8], [15, 9.5, 7], [20, 6.8, -2], [20, 6.8, -2])(t);
  } },
  // S24 — malam berbintang: Ayam tidak bisa tidur di puncak bukit
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", env: { dark: 0.9 } });
      place(R.ayam, 17.5, -4.5, 0.2, HILL); // di samping slime, bukan di depannya
      R.ayamHead.rotation.x = -0.5; // memandangi langit berbintang
      R.ayamHead.rotation.y = Math.sin(f * 0.03) * 0.25;
      return cam([23, 8.5, 6], [22, 8.5, 5], [18.5, 7.8, -4], [18.5, 8, -4.5])(t);
  } },
  // S25 — hari besar: kampung berkumpul di puncak bukit sejak pagi
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true });
      place(R.ayam, 19, -2, 1.5708, HILL); // melangkah maju, dada membusung
      R.ayamHead.rotation.x = -0.2;
      R.ayam.position.y = HILL + Math.abs(Math.sin(f * 0.2)) * 0.06;
      place(R.bima, 17, 0.5, -2.4, HILL); cheerArms(R.armL, R.armR, t, f * 0.26);
      place(R.tetangga, 26, 1, -0.6, HILL);
      place(R.tetangga2, 15, 2, 0.4, HILL); cheerArms(R.t2ArmL, R.t2ArmR, t, f * 0.3);
      place(R.monster, 27, -5, 0.6, HILL); R.mArmL.rotation.set(-2.8, 0, 0.5); R.mArmR.rotation.set(-2.8, 0, -0.5);
      place(R.kelinci, 16, -4, 0.3, HILL); R.kelinci.position.y = HILL + Math.abs(Math.sin(f * 0.32)) * 0.12;
      place(R.bebek, 24, 2.5, -0.4, HILL);
      return cam([22, 11, 14], [22, 10.5, 12], [21, 7.2, -2], [21, 7.2, -2])(t);
  } },
  // S26 — ancang-ancang: lari kecil, semakin cepat, MELOMPAT ke slime
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true });
      const run = smoother(frac(t, 0.05, 0.8));
      const px = lerp(16, 20.4, run); // mulai x=16 (tapak atas bukit)
      const jump = smoother(frac(t, 0.8, 1));
      place(R.ayam, px, -2, 1.5708, HILL + Math.abs(Math.sin(f * 0.5)) * 0.12 * (1 - jump) + jump * 1.6);
      R.ayamHead.rotation.x = -0.3;
      place(R.bima, 15.5, -4.5, -2.6, HILL); // menonton dari sisi, tidak menutupi lintasan
      R.bimaHead.rotation.x = -0.2;
      place(R.kelinci, 15, -4, 0.2, HILL);
      place(R.monster, 27, -5, 0.5, HILL);
      return cam([11, 9.5, 9], [15, 9.5, 7], [18, 7.2, -2], [20, 7.2, -2])(t);
  } },
  // S27 — BOING! Ayam melambung sampai sejajar awan rendah
  { pose: (t, R, f) => {
      const squash = Math.sin(frac(t, 0, 0.25) * Math.PI); // slime mengempis lalu kembali
      stage(R, { slime: "hill", bunga: true, benderaKecil: true, slimeSquash: squash });
      const rise = smoother(frac(t, 0.05, 0.7));
      place(R.ayam, 22, -2, 0.3, lerp(HILL + 2, 18, rise));
      R.ayamHead.rotation.x = -0.4;
      R.ayamHead.rotation.y = Math.sin(f * 0.06) * 0.2;
      place(R.bima, 17, 0.5, -2.6, HILL);
      R.bimaHead.rotation.x = -0.5; // menengadah mengikuti Ayam
      R.armR.rotation.x = -2.6;
      place(R.monster, 27, -5, 0.5, HILL);
      R.monsterHead.rotation.x = -0.4;
      return cam([26, 16, 10], [26, 17, 9], [22, 14, -2], [22, 14.5, -2])(t);
  } },
  // S28 — MELAYANG di samping burung-burung
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, burungLangit: true });
      birdsCircle(R, f, 22, 16, -2, 5.5);
      place(R.ayam, 22, -2, 0.3, 16 + Math.sin(f * 0.08) * 0.4); // melayang
      R.ayamHead.rotation.x = -0.25;
      R.ayamHead.rotation.y = Math.sin(f * 0.05) * 0.3;
      return cam([30, 16.5, 8], [29, 16.5, 7], [22, 16, -2], [22, 16, -2])(t);
  } },
  // S29 — pemandangan dari atas: ladang, kandang, teman-teman kecil
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, burungLangit: true });
      birdsCircle(R, f, 22, 15, -2, 5);
      place(R.ayam, 22, 0, 0.5, 14.5 + Math.sin(f * 0.07) * 0.3);
      R.ayamHead.rotation.x = 0.35; // menunduk melihat kampung di bawah
      R.ayamHead.rotation.y = Math.sin(f * 0.05) * 0.35;
      place(R.bima, 17, 0.5, -2.6, HILL);
      R.bimaHead.rotation.x = -0.5;
      return cam([30, 16, 12], [29, 15.5, 11], [21, 12.5, -1], [19, 11.5, 0])(t);
  } },
  // S30 — sorak kampung paling keras; Bima melompat sampai jatuh duduk
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true });
      place(R.bima, 18, 0.5, -2.5, HILL);
      const sit = smoother(frac(t, 0.7, 0.85)); // di akhir jatuh duduk
      if (sit > 0) {
        R.bima.scale.y = lerp(1, 0.78, sit);
        R.bimaHead.rotation.x = 0.3 * sit;
      } else {
        cheerArms(R.armL, R.armR, t, f * 0.3);
        R.bima.position.y = HILL + Math.abs(Math.sin(f * 0.3)) * 0.18;
      }
      place(R.tetangga, 26, 1, -0.6, HILL); cheerArms(R.tArmL, R.tArmR, t, f * 0.28);
      place(R.tetangga2, 15, 2, 0.4, HILL); cheerArms(R.t2ArmL, R.t2ArmR, t, f * 0.32);
      place(R.monster, 27, -5, 0.6, HILL); R.mArmL.rotation.set(-2.8, 0, 0.5); R.mArmR.rotation.set(-2.8, 0, -0.5);
      place(R.ayam, 22, -2, 0.3, 14 + Math.sin(f * 0.08) * 0.4); // masih melayang di atas
      place(R.kelinci, 16, -4, 0.2, HILL); R.kelinci.position.y = HILL + Math.abs(Math.sin(f * 0.36)) * 0.14;
      place(R.bebek, 24, 2.5, -0.4, HILL); R.bebek.position.y = HILL + Math.abs(Math.sin(f * 0.34)) * 0.1;
      return cam([22, 12, 15], [21, 11.5, 14], [21, 9.5, -2], [21, 9.5, -2])(t);
  } },
  // S31 — meluncur turun, berputar sekali, mendarat empuk di slime
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true });
      const down = smoother(frac(t, 0.05, 0.85));
      const px = lerp(24, 22, down);
      const py = lerp(15, HILL + 2, down);
      place(R.ayam, px, -2, 0.3, py);
      R.ayam.rotation.y = t * Math.PI * 2; // berputar satu kali
      R.ayamHead.rotation.x = -0.15;
      place(R.bima, 17, 0.5, -2.6, HILL);
      R.bimaHead.rotation.x = -0.4;
      place(R.kelinci, 16, -4, 0.2, HILL);
      return cam([28, 11, 9], [27, 11, 8], [22, 10, -2], [22, 10, -2])(t);
  } },
  // S32 — Burung Tua mendarat dan membungkuk hormat
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true });
      const land = smoother(frac(t, 0.05, 0.4));
      place(R.burungTua, 24.5, -3.5, -1.8, lerp(12, HILL, land));
      const bow = smoother(frac(t, 0.5, 0.75)); // membungkuk hormat
      R.burungTuaHead.rotation.x = lerp(0, 0.55, bow);
      place(R.ayam, 22, -2, 1.2, HILL + 2); // di atas slime, terharu
      R.ayamHead.rotation.x = -0.1;
      place(R.bima, 18, 0.5, -2.5, HILL);
      R.bimaHead.rotation.x = -0.2;
      place(R.monster, 28, -6.5, 0.5, HILL);
      return cam([30, 10, 8], [29, 10, 7], [23, 7.6, -3], [23, 7.6, -3])(t);
  } },
  // S33 — pesta malam di puncak bukit; nama dicatat di papan kayu balai
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true, papanKayu: true, env: { dark: 0.75 } });
      place(R.bima, 25, -5, -1.2, HILL);
      R.bimaHead.rotation.x = -0.15;
      place(R.tetangga, 28, -4.5, -0.6, HILL); // menunjuk papan kayu
      R.tArmR.rotation.x = -2.4;
      place(R.ayam, 24, -3, 0.8, HILL + 2); // di atas slime, bintang pesta
      R.ayamHead.rotation.x = -0.15;
      place(R.kelinci, 22.5, -5.5, 0.4, HILL);
      place(R.monster, 29.5, -6.5, 0.8, HILL);
      return cam([32, 11, 6], [31, 11, 5], [26, 7.6, -4.5], [25, 7.6, -4.5])(t);
  } },
  // S34 — Ayam bercerita tanpa henti tentang melayang di samping awan
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true, env: { dark: 0.6 } });
      place(R.ayam, 22, -1, 0.5, HILL + 2); // bercerita dari atas slime
      R.ayamHead.rotation.y = Math.sin(f * 0.09) * 0.5;
      R.ayamHead.rotation.x = -0.2 + Math.sin(f * 0.12) * 0.1;
      place(R.bima, 19, 1, -2.5, HILL);
      R.bimaHead.rotation.x = -0.25; // mendengarkan, mata berbinar
      place(R.kelinci, 25.5, 0.5, 2.8, HILL); R.kelinciHead.rotation.x = -0.2;
      place(R.bebek, 20, -4.5, 0.2, HILL); R.bebekHead.rotation.x = -0.2;
      return cam([28, 10.5, 9], [27, 10.5, 8], [22, 7.6, -1.5], [22, 7.6, -1.5])(t);
  } },
  // S35 — terbang mingguan; Bebek & Kelinci mengantre mencoba
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true, env: { sunset: 0.25 } });
      place(R.ayam, 22, -2, 0.3, HILL + 2 + Math.abs(Math.sin(f * 0.2)) * 2.5); // melayang di atas slime
      R.ayamHead.rotation.x = -0.3;
      place(R.bebek, 18.5, 1.5, -2.4, HILL); // antre, menengadah
      R.bebekHead.rotation.x = -0.4;
      place(R.kelinci, 26, 1.5, 2.6, HILL);
      R.kelinciHead.rotation.x = -0.4;
      R.kelinci.position.y = HILL + Math.abs(Math.sin(f * 0.3)) * 0.1;
      place(R.bima, 16.5, 1.5, -2.6, HILL);
      cheerArms(R.armL, R.armR, t, f * 0.25);
      return cam([30, 10.5, 10], [29, 10.5, 9], [22, 8.5, -2], [22, 8.5, -2])(t);
  } },
  // S36 — penutup: ayam pertama yang menyentuh awan; selamat malam, kampung kubus
  { pose: (t, R, f) => {
      stage(R, { slime: "hill", bunga: true, benderaKecil: true, burungLangit: true, env: { sunset: 0.6, dark: 0.15 } });
      birdsCircle(R, f, 10, 18, -8, 14);
      place(R.bima, 20, -1, -2.4, HILL);
      R.bimaHead.rotation.x = -0.35; // menengadah ke langit senja
      place(R.ayam, 22, -1, -2.6, HILL + 2); // di atas slime, memandang senja
      R.ayamHead.rotation.x = -0.35;
      R.ayamHead.rotation.y = Math.sin(f * 0.04) * 0.2;
      place(R.burungTua, 25, -4, 0.4, HILL);
      R.burungTuaHead.rotation.x = -0.3;
      return cam([30, 10.5, 10], [32, 11, 12], [21, 7.6, -2], [21, 7.6, -2])(t);
  } },
];

export function poseFrame(frame: number, R: MenaraRefs, camera: THREE.Camera) {
  resetAll(R);
  // Tentukan adegan dari frame (rentang mengikuti timing kata final).
  let k = 1;
  for (let i = 1; i <= 36; i++) {
    const r = sceneRange(i);
    if (frame >= r.a) k = i;
    if (frame >= r.a && frame <= r.b) break;
  }
  const r = sceneRange(k);
  const t = frac(frame, r.a, r.b);
  const { pos, look } = SCENES[k - 1].pose(t, R, frame);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  // kehidupan idle halus agar tak ada shot yang beku
  R.ayamHead.rotation.y += Math.sin(frame * 0.07) * 0.12;
  R.kelinciHead.rotation.y += Math.sin(frame * 0.06 + 1) * 0.1;
  R.monster.position.y += Math.abs(Math.sin(frame * 0.045)) * 0.03;
  R.burungTuaHead.rotation.y += Math.sin(frame * 0.05 + 2) * 0.06;
}
