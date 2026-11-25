import * as THREE from "three";
import { SEG, WORDS, TOTAL_FRAMES } from "./timing";
import { MenaraRefs, BIMA_PLOT, TETANGGA_PLOT, MONSTER_PLOT, KELINCI_PLOT, RIVER_Z, BRIDGE_X } from "./world";
import { clamp01, smoother, lerp, lerp3 } from "./vox";

// ============================================================================
// LONG lanskap: "Lomba Menara Tertinggi" (sumber: db-panjang-2026-11-27,
// tayang Senin 30 Nov 2026 18.30 WIB). 37 adegan naskah dipetakan ke 37 shot;
// batas adegan dihitung dari timing kata (WORDS) hasil make_timing.py —
// SCENE_COUNTS = jumlah kata per adegan dengan aturan belah-tanda-hubung
// yang sama seperti scripts/make_timing.py.
// ============================================================================

type V3 = [number, number, number];
const frac = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

export const SCENE_COUNTS = [29, 28, 25, 24, 29, 25, 24, 23, 30, 28, 27, 25, 30, 26, 28, 25, 28, 29, 26, 32, 30, 24, 26, 29, 28, 26, 26, 26, 26, 33, 31, 26, 26, 27, 28, 28, 32];
const SCENE_START_WORD: number[] = [];
{ let acc = 0; for (const c of SCENE_COUNTS) { SCENE_START_WORD.push(acc); acc += c; } }

export function sceneRange(k: number): { a: number; b: number } {
  // k: 1..37
  if (WORDS.length > 100) {
    const a = k === 1 ? 0 : WORDS[SCENE_START_WORD[k - 1]].start;
    const b = k === 37 ? TOTAL_FRAMES : WORDS[SCENE_START_WORD[k]].start - 1;
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
function swingLimbs(armL: THREE.Group, armR: THREE.Group, legL: THREE.Group, legR: THREE.Group, ph: number, amp = 0.5) {
  const s = Math.sin(ph);
  legL.rotation.x = s * amp; legR.rotation.x = -s * amp;
  armL.rotation.x = -s * amp * 0.7; armR.rotation.x = s * amp * 0.7;
}
function cheerArms(armL: THREE.Group, armR: THREE.Group, t: number, ph: number) {
  const up = Math.sin(ph) * 0.18;
  armL.rotation.set(-2.9 + up, 0, 0.55); armR.rotation.set(-2.9 - up, 0, -0.55);
  void t;
}
function carryArms(armL: THREE.Group, armR: THREE.Group) {
  armL.rotation.set(-1.5, 0, 0.3); armR.rotation.set(-1.5, 0, -0.3);
}

// ------------------------------------------------------------ state panggung
export interface StageOpts {
  bimaLayers?: number; bimaFallen?: number; // 0..1 progres roboh
  tetanggaLayers?: number; tetanggaFallen?: number;
  monsterLayers?: number; kelinciTower?: boolean;
  waterY?: number; bridge?: number; // 0 sembunyi, 0<x<1 progres deck, 1 penuh
  rails?: boolean; bridgeFlagOn?: boolean; picnic?: boolean;
  stormX?: number; env?: Partial<EnvState>;
}
function stage(R: MenaraRefs, o: StageOpts) {
  const bl = o.bimaLayers ?? 7;
  R.towerBimaLayers.forEach((L, i) => { L.visible = i < bl; });
  R.towerFlag.visible = bl >= 7 && !(o.bimaFallen && o.bimaFallen > 0.4);
  const bf = o.bimaFallen ?? 0;
  R.towerBima.rotation.x = -bf * 1.45;
  R.towerBima.position.z = BIMA_PLOT[1] - bf * 1.2;
  R.rubbleBima.visible = bf > 0.85;
  if (bf > 0.85) R.towerBima.visible = false; else R.towerBima.visible = true;
  const tl = o.tetanggaLayers ?? 6;
  R.towerTetanggaLayers.forEach((L, i) => { L.visible = i < tl; });
  const tf = o.tetanggaFallen ?? 0;
  R.towerTetangga.rotation.z = tf * 1.5;
  R.rubbleTetangga.visible = tf > 0.85;
  R.towerTetangga.visible = tf <= 0.85;
  const ml = o.monsterLayers ?? 3;
  R.towerMonsterLayers.forEach((L, i) => { L.visible = i < ml; });
  R.towerKelinci.visible = o.kelinciTower ?? true;
  R.water.position.y = o.waterY ?? -0.75;
  const br = o.bridge ?? 0;
  R.bridge.visible = br > 0;
  if (br > 0) {
    const n = br >= 1 ? 7 : Math.max(1, Math.floor(br * 7));
    R.bridgeDeck.forEach((d, i) => { (d as THREE.Object3D).visible = i < n; });
    R.bridgeRails.visible = o.rails ?? false;
    R.bridgeFlag.visible = o.bridgeFlagOn ?? false;
    const blanket = R.bridge.getObjectByName("blanket"); if (blanket) blanket.visible = o.picnic ?? false;
    const cake = R.bridge.getObjectByName("cake"); if (cake) cake.visible = o.picnic ?? false;
  }
  R.storm.position.x = o.stormX ?? 160;
  ENV.dark = o.env?.dark ?? 0; ENV.sunset = o.env?.sunset ?? 0; ENV.storm = o.env?.storm ?? 0;
  skyMix(R, ENV);
  R.applyEnv?.(ENV.dark, ENV.sunset, ENV.storm);
}

// ------------------------------------------------------------ reset
function resetAll(R: MenaraRefs) {
  const B = R.bima;
  place(B, -6, 3, 0.5); B.scale.setScalar(1);
  R.armL.rotation.set(0, 0, 0.12); R.armR.rotation.set(0, 0, -0.12);
  R.legL.rotation.set(0, 0, 0); R.legR.rotation.set(0, 0, 0);
  R.bimaHead.rotation.set(0, 0, 0);
  R.headNormal.visible = true; R.headTired.visible = false;
  place(R.tetangga, 4.5, -1, -0.5);
  R.tArmL.rotation.set(0, 0, 0.12); R.tArmR.rotation.set(0, 0, -0.12);
  R.tLegL.rotation.set(0, 0, 0); R.tLegR.rotation.set(0, 0, 0);
  R.tetanggaHead.rotation.set(0, 0, 0);
  place(R.tetangga2, 2, 13, 0.15);
  R.t2ArmL.rotation.set(0, 0, 0.12); R.t2ArmR.rotation.set(0, 0, -0.12);
  R.tetangga2Head.rotation.set(0, 0, 0);
  place(R.monster, 15.5, 7, -0.4); R.monster.scale.setScalar(1);
  R.mArmL.rotation.set(0, 0, 0.1); R.mArmR.rotation.set(0, 0, -0.1);
  R.mLegL.rotation.set(0, 0, 0); R.mLegR.rotation.set(0, 0, 0);
  R.monsterHead.rotation.set(0, 0, 0);
  place(R.kelinci, -17.5, 9, -0.3); R.kelinciHead.rotation.set(0, 0, 0);
  place(R.ayam, -3, 13.5, 0.1); R.ayamHead.rotation.set(0, 0, 0);
  place(R.bebek, 5.5, 13.5, -0.1); R.bebekHead.rotation.set(0, 0, 0);
  place(R.sapi, -6, -28.5, 0); R.sapiHead.rotation.set(0, 0, 0);
  place(R.sapiAnak, -3.8, -28.2, 0.2);
  R.towerBima.rotation.set(0, 0, 0); R.towerBima.position.set(BIMA_PLOT[0], 0, BIMA_PLOT[1]);
  R.towerTetangga.rotation.set(0, 0, 0);
  R.towerKelinci.rotation.set(0, 0, 0);
  R.bridgeFlag.scale.setScalar(1);
  R.ladderSmall.visible = true;
  stage(R, {});
}

// ------------------------------------------------------------ shot per adegan
interface Shot { pose: (t: number, R: MenaraRefs, f: number) => { pos: V3; look: V3 } }
const cam = (a: V3, b: V3, la: V3, lb: V3) => (t: number) => ({ pos: lerp3(a, b, smoother(t)), look: lerp3(la, lb, smoother(t)) });

export const SCENES: Shot[] = [
  // S1 — pengumuman lomba: wide lapangan + kampung, Bima bersemangat di depan
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 0, tetanggaLayers: 0, monsterLayers: 0, kelinciTower: false });
      R.ladderSmall.visible = false;
      place(R.bima, -2, 6, 0.2);
      cheerArms(R.armL, R.armR, t, f * 0.3);
      R.bima.position.y = Math.abs(Math.sin(f * 0.22)) * 0.16;
      place(R.tetangga, 6, 8, -0.3); place(R.tetangga2, 10, 10, 0.4);
      place(R.ayam, -6, 11, 0.2); place(R.bebek, 1, 12, 0);
      return cam([16, 7, 34], [10, 6, 30], [0, 3, -2], [-1, 2.6, 0])(t);
  } },
  // S2 — rencana Bima: menara spiral + bendera; Bima menunjuk petaknya
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 0, tetanggaLayers: 2, monsterLayers: 1, kelinciTower: false });
      R.ladderSmall.visible = false;
      place(R.bima, -5.5, 3.5, -0.9);
      const point = smoother(frac(t, 0.15, 0.35)) * (1 - smoother(frac(t, 0.85, 1)));
      R.armR.rotation.x = -2.6 * point;
      R.bimaHead.rotation.y = Math.sin(f * 0.05) * 0.12;
      place(R.tetangga, 5, 0.5, -2.2); R.tArmR.rotation.x = -0.8;
      place(R.tetangga2, 7.5, 2, -2.6);
      return cam([-16, 4.5, 16], [-14.5, 4.2, 14.5], [-7, 2.4, 0], [-8, 2.6, 0])(t);
  } },
  // S3 — penonton piknik mengelilingi lapangan
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 0, tetanggaLayers: 2, monsterLayers: 1, kelinciTower: false });
      R.ladderSmall.visible = false;
      place(R.ayam, -8, 12, 0.3); R.ayamHead.rotation.y = Math.sin(f * 0.09) * 0.4;
      place(R.bebek, -4.5, 12.8, -0.2);
      place(R.kelinci, -1, 12.2, 0.15); R.kelinci.position.y = Math.abs(Math.sin(f * 0.3)) * 0.12;
      place(R.tetangga2, 3.5, 12.5, -0.3);
      place(R.bima, 8, 11.5, 0.5);
      R.ayam.position.y = Math.abs(Math.sin(f * 0.26)) * 0.08;
      return cam([6, 5, 30], [3, 4.6, 28], [-2, 1.6, 8], [-3, 1.5, 9])(t);
  } },
  // S4 — Bima mulai menumpuk balok: menara tumbuh 0 -> 3 lapis
  { pose: (t, R, f) => {
      const grow = Math.min(3, Math.floor(frac(t, 0.1, 0.9) * 3.99));
      stage(R, { bimaLayers: grow, tetanggaLayers: 3, monsterLayers: 1, kelinciTower: false });
      R.ladderSmall.visible = false;
      place(R.bima, -6.8, 1.8, -2.4);
      const lift = Math.abs(Math.sin(f * 0.14));
      R.armL.rotation.x = -1.6 - lift * 0.7; R.armR.rotation.x = -1.6 - lift * 0.7;
      R.bimaHead.rotation.x = -0.25;
      return cam([-19, 4.5, 13], [-18, 4.8, 12], [-9.5, 2.2, 0], [-10, 2.6, 0])(t);
  } },
  // S5 — tiap peserta di petaknya: pan melintasi lapangan
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 3, tetanggaLayers: 3, monsterLayers: 2, kelinciTower: false });
      R.ladderSmall.visible = false;
      place(R.bima, -6.8, 1.8, -2.4); carryArms(R.armL, R.armR);
      place(R.tetangga, 5, -1.5, -2.4); carryArms(R.tArmL, R.tArmR);
      place(R.monster, 16.5, 6.5, -2.8); R.mArmL.rotation.x = -1.2; R.mArmR.rotation.x = -1.2;
      return cam([-24, 5.5, 20], [24, 5.5, 20], [-12, 2.5, 0], [12, 2.5, 0])(t);
  } },
  // S6 — Tetangga membangun cepat: menara bata 4 lapis
  { pose: (t, R, f) => {
      const grow = 3 + Math.min(1, Math.floor(frac(t, 0.2, 0.8) * 1.99));
      stage(R, { bimaLayers: 3, tetanggaLayers: grow, monsterLayers: 2, kelinciTower: false });
      R.ladderSmall.visible = false;
      place(R.tetangga, 4.8, -1.2, -2.3);
      const lift = Math.abs(Math.sin(f * 0.17));
      R.tArmL.rotation.x = -1.7 - lift * 0.6; R.tArmR.rotation.x = -1.7 - lift * 0.6;
      place(R.bima, -14, 6, -0.8); R.bimaHead.rotation.y = 0.5; // Bima melirik
      place(R.tetangga2, 1, 11, -0.4); place(R.ayam, -2, 12, 0.2);
      return cam([17, 4.5, 13], [15.5, 4.8, 12], [7.5, 2.4, -3], [8, 2.8, -4])(t);
  } },
  // S7 — Kelinci dan menara wortelnya
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 3, tetanggaLayers: 4, monsterLayers: 2, kelinciTower: true });
      R.ladderSmall.visible = false;
      place(R.kelinci, -17.8, 8.6, -2.6);
      R.kelinci.position.y = Math.abs(Math.sin(f * 0.24)) * 0.14;
      R.kelinciHead.rotation.x = -0.2;
      place(R.bima, -13, 10, -0.7); R.armL.rotation.z = 0.4;
      return cam([-27, 4, 16], [-26, 4.2, 15], [-19.5, 1.8, 6.5], [-20, 2, 6])(t);
  } },
  // S8 — menara Bima menyusul: 5 lapis, Bima di tangga kecil memasang balok
  { pose: (t, R, f) => {
      const grow = 4 + Math.min(1, Math.floor(frac(t, 0.25, 0.75) * 1.99));
      stage(R, { bimaLayers: grow, tetanggaLayers: 4, monsterLayers: 2, kelinciTower: true });
      place(R.bima, -7.4, 1.2, -2.5, 3.4); // di tangga kecil, membelakangi sebagian
      R.armR.rotation.x = -2.4 + Math.sin(f * 0.1) * 0.2; R.armL.rotation.x = -1.2;
      R.bimaHead.rotation.x = -0.3;
      return cam([-17.5, 5.5, 12.5], [-16.5, 6, 11.5], [-9.8, 3.4, 0], [-10, 3.8, 0])(t);
  } },
  // S9 — menara Tetangga miring... lalu tegak lagi (tepuk tangan)
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 5, tetanggaLayers: 5, monsterLayers: 2, kelinciTower: true });
      R.ladderSmall.visible = false;
      const tilt = Math.sin(frac(t, 0.1, 0.45) * Math.PI) * 0.13 * (1 - smoother(frac(t, 0.5, 0.7)));
      R.towerTetangga.rotation.z = tilt;
      place(R.tetangga, 4.6, -1, -2.3);
      const fix = smoother(frac(t, 0.5, 0.7));
      R.tArmR.rotation.x = lerp(-0.4, -2.2, fix);
      place(R.tetangga2, 0, 11.5, -0.4); place(R.ayam, -3.5, 12.5, 0.1); place(R.bebek, 6.5, 12, -0.2);
      const gasp = Math.sin(frac(t, 0.15, 0.4) * Math.PI);
      R.tetangga2Head.rotation.x = -0.3 * gasp; R.ayamHead.rotation.x = -0.3 * gasp;
      const cheer = smoother(frac(t, 0.7, 0.85));
      if (cheer > 0) { cheerArms(R.t2ArmL, R.t2ArmR, t, f * 0.3); }
      return cam([16, 4.5, 14], [15, 4.8, 13], [7.8, 2.6, -3.5], [8, 2.8, -4])(t);
  } },
  // S10 — Monster Ungu dan menara tanahnya yang kokoh
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 5, tetanggaLayers: 5, monsterLayers: 3, kelinciTower: true });
      R.ladderSmall.visible = false;
      place(R.monster, 15.8, 7.2, -2.9);
      const pat = Math.abs(Math.sin(f * 0.12));
      R.mArmL.rotation.x = -1.4 - pat * 0.5; R.mArmR.rotation.x = -1.4 - pat * 0.5;
      R.monsterHead.rotation.y = Math.sin(f * 0.06) * 0.15;
      return cam([27, 5, 15], [25.5, 5.2, 14], [19, 2.2, 4], [20, 2.2, 4])(t);
  } },
  // S11 — tiga menara bersaing; Ayam membunyikan lonceng (lompat kecil)
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 6, tetanggaLayers: 6, monsterLayers: 3, kelinciTower: true });
      place(R.ayam, -1, 9, 0.2);
      R.ayam.position.y = Math.abs(Math.sin(f * 0.35)) * 0.22;
      R.ayamHead.rotation.x = -0.35;
      place(R.bima, -6.5, 2, -2.4); R.armR.rotation.x = -2.2;
      place(R.tetangga, 4.8, -1.2, -2.3); R.tArmR.rotation.x = -2.2;
      place(R.tetangga2, 3, 12.5, -0.3); cheerArms(R.t2ArmL, R.t2ArmR, t, f * 0.28);
      return cam([0, 6.5, 30], [0, 6.2, 28], [0, 3, -1], [0, 3.2, -1])(t);
  } },
  // S12 — menara Bima TUJUH lapis + bendera; Bima membusungkan dada
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 7, tetanggaLayers: 6, monsterLayers: 3, kelinciTower: true });
      place(R.bima, -6.2, 2.6, 0.1);
      R.armL.rotation.set(0.2, 0, 0.85); R.armR.rotation.set(0.2, 0, -0.85); // tangan di pinggang
      R.bimaHead.rotation.x = -0.28; // menengadah bangga
      R.towerFlag.rotation.y = Math.sin(f * 0.08) * 0.2;
      return cam([-16, 5, 15], [-15, 5.6, 14], [-9.6, 3.8, 0], [-10, 4.2, 0])(t);
  } },
  // S13 — dari atas tangga, Bima melambai ke penonton di bawah
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 7, tetanggaLayers: 6, monsterLayers: 3, kelinciTower: true });
      place(R.bima, -7.4, 1.2, -2.5, 5.6);
      const wv = smoother(frac(t, 0.1, 0.3));
      R.armR.rotation.x = -2.9 * wv; R.armR.rotation.z = -0.3 + Math.sin(f * 0.3) * 0.3 * wv;
      R.bimaHead.rotation.x = 0.3;
      place(R.tetangga2, -2, 12.5, -0.3); cheerArms(R.t2ArmL, R.t2ArmR, t, f * 0.3);
      place(R.ayam, -5, 13, 0.15); place(R.bebek, 1.5, 13.2, -0.1);
      return cam([-15, 7.5, 13], [-14.5, 7.8, 12.5], [-9, 4.6, 0.5], [-9.5, 4.8, 0.3])(t);
  } },
  // S14 — awan gelap berkumpul; ujung menara bergoyang; juri cemas
  { pose: (t, R, f) => {
      const st = smoother(frac(t, 0.1, 0.9));
      stage(R, { bimaLayers: 7, tetanggaLayers: 6, monsterLayers: 3, kelinciTower: true,
        stormX: lerp(160, 55, st), env: { dark: 0, sunset: 0, storm: st * 0.55 } });
      const sway = Math.sin(f * 0.11) * 0.02 * (0.4 + st);
      R.towerBima.rotation.z = sway; R.towerTetangga.rotation.z = -sway * 0.8;
      place(R.tetangga2, 0, 10.5, -0.5); R.tetangga2Head.rotation.x = -0.45; // juri memandang langit
      place(R.bima, -6.2, 2.6, -0.6); R.bimaHead.rotation.x = -0.4;
      place(R.tetangga, 4.8, -1, -0.7); R.tetanggaHead.rotation.x = -0.4;
      return cam([4, 6, 27], [2, 6.4, 25], [0, 4.5, -2], [-1, 5, -2])(t);
  } },
  // S15 — peserta protes "sedikit lagi!"; Bima memasang bendera penanda angin
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 7, tetanggaLayers: 6, monsterLayers: 3, kelinciTower: true,
        stormX: 30, env: { storm: 0.7 } });
      R.towerBima.rotation.z = Math.sin(f * 0.13) * 0.025;
      place(R.bima, -7.4, 1.2, -2.5, 6.4);
      R.armR.rotation.x = -2.8; R.bimaHead.rotation.x = -0.35;
      R.towerFlag.rotation.y = Math.sin(f * 0.35) * 0.5; // bendera berkibar kencang
      place(R.tetangga, 4.5, 0, -0.5); R.tArmR.rotation.x = -2.6; // protes
      place(R.tetangga2, 0, 10.5, -0.6); R.tetangga2Head.rotation.x = -0.3;
      return cam([-14, 6.5, 14], [-13.5, 7, 13.5], [-9.5, 5, 0], [-10, 5.4, 0])(t);
  } },
  // S16 — badai! penonton berlarian berteduh; menara bergoyang hebat
  { pose: (t, R, f) => {
      stage(R, { bimaLayers: 7, tetanggaLayers: 6, monsterLayers: 3, kelinciTower: true,
        stormX: 0, env: { storm: 1 } });
      const sway = Math.sin(f * 0.16) * 0.05;
      R.towerBima.rotation.z = sway; R.towerTetangga.rotation.z = -sway;
      R.towerKelinci.rotation.z = sway * 0.6;
      // penonton lari ke arah rumah/balai (kanan)
      const run = smoother(frac(t, 0.05, 0.6));
      const rx = lerp(0, 17, run);
      place(R.ayam, -3 + rx, 13.5, 0.1); R.ayam.position.y = Math.abs(Math.sin(f * 0.5)) * 0.15;
      place(R.bebek, 5.5 + rx * 0.9, 13.8, -0.1); R.bebek.position.y = Math.abs(Math.sin(f * 0.46)) * 0.13;
      place(R.tetangga2, 2 + rx * 1.05, 12.5, 0.3);
      R.t2ArmL.rotation.x = Math.sin(f * 0.5) * 0.4; R.t2ArmR.rotation.x = -Math.sin(f * 0.5) * 0.4;
      place(R.bima, -6.4, 2.4, -0.7); R.bimaHead.rotation.x = -0.3;
      return cam([2, 6, 29], [0, 6.5, 27], [0, 3.5, -1], [-1, 3.8, -1])(t);
  } },
  // S17 — menara Tetangga roboh jadi gundukan aman; ia berlari membantu Bima
  { pose: (t, R, f) => {
      const fall = smoother(frac(t, 0.08, 0.3));
      stage(R, { bimaLayers: 7, tetanggaLayers: 6, tetanggaFallen: fall, monsterLayers: 3, kelinciTower: true,
        stormX: 0, env: { storm: 0.95 } });
      R.towerBima.rotation.z = Math.sin(f * 0.15) * 0.045;
      const run = smoother(frac(t, 0.4, 0.9));
      const p = lerp3([5.2, 0, 0.5], [-4.2, 0, 3.4], run);
      place(R.tetangga, p[0], p[2], lerp(-0.6, -1.1, run));
      if (run > 0.02 && run < 0.98) swingLimbs(R.tArmL, R.tArmR, R.tLegL, R.tLegR, f * 0.45, 0.55);
      R.tetangga.position.y = Math.abs(Math.sin(f * 0.45)) * 0.07 * run * (1 - run) * 4;
      place(R.bima, -6.6, 2.2, -0.8);
      R.armL.rotation.x = -1.9; R.armR.rotation.x = -1.9; // menahan menara
      return cam([10, 5.5, 22], [6, 5.5, 20], [2, 3, -2], [-2, 3, -1])(t);
  } },
  // S18 — menara Bima bergoyang... dan ROBOH ke arah sungai
  { pose: (t, R, f) => {
      const swayAmp = lerp(0.03, 0.1, frac(t, 0, 0.5));
      const fall = smoother(frac(t, 0.52, 0.78));
      stage(R, { bimaLayers: 7, bimaFallen: fall, tetanggaLayers: 6, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 0, env: { storm: 0.9 } });
      if (fall <= 0) R.towerBima.rotation.z = Math.sin(f * 0.17) * swayAmp;
      place(R.bima, -5.4, 3.4, -1.1);
      const reach = 1 - smoother(frac(t, 0.75, 0.9));
      R.armL.rotation.x = -2.2 * reach; R.armR.rotation.x = -2.2 * reach;
      R.bimaHead.rotation.x = lerp(-0.2, 0.35, smoother(frac(t, 0.75, 0.95))); // tertunduk sesudah roboh
      place(R.tetangga, -3.4, 3.8, -1.0);
      return cam([-2, 5.5, 21], [-3, 5.2, 19], [-9, 3.2, -1], [-10, 2.6, -2])(t);
  } },
  // S19 — Bima menatap runtuhan di tepi sungai; hati hancur
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 10, env: { storm: 0.75 }, waterY: -0.6 });
      place(R.bima, -8.8, -10.8, Math.PI + 0.4); // menghadap sungai/runtuhan
      R.bimaHead.rotation.x = 0.4; R.armL.rotation.z = 0.3; R.armR.rotation.z = -0.3;
      place(R.monster, -3.5, -7.5, 2.6); R.monsterHead.rotation.x = 0.25;
      return cam([-14.5, 3.4, -4.5], [-14, 3.2, -5.5], [-9.2, 1.1, -11.5], [-9.6, 1, -12.5])(t);
  } },
  // S20 — sungai MELUAP! air naik cepat
  { pose: (t, R, f) => {
      const rise = smoother(frac(t, 0.15, 0.85));
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 16, env: { storm: 0.6 }, waterY: lerp(-0.6, 0.3, rise) });
      place(R.bima, -8.8, -10.5, Math.PI + 0.3); R.bimaHead.rotation.x = -0.15;
      place(R.tetangga, -4.5, -9.8, Math.PI - 0.3); cheerArms(R.tArmL, R.tArmR, t, f * 0.2); // menunjuk panik
      place(R.bebek, -13.5, -11, Math.PI); R.bebek.position.y = Math.abs(Math.sin(f * 0.4)) * 0.1;
      return cam([2, 5, 6], [0, 5.2, 4], [-8, 1, -18], [-9, 1, -19])(t);
  } },
  // S21 — warga seberang terjebak; anak hewan menangis di seberang
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 22, env: { storm: 0.5 }, waterY: 0.35 });
      place(R.sapi, -6, -28.5, 0); R.sapiHead.rotation.x = 0.2;
      place(R.sapiAnak, -3.8, -28.2, 0.2); R.sapiAnak.position.y = Math.abs(Math.sin(f * 0.3)) * 0.08;
      place(R.ayam, -11, -27.8, 0.3); R.ayamHead.rotation.x = 0.3;
      place(R.bebek, -14.5, -28, -0.2);
      place(R.kelinci, 2, -27.6, 0.4); R.kelinciHead.rotation.x = 0.25;
      place(R.bima, -9.5, -11.5, Math.PI + 0.2); R.bimaHead.rotation.x = -0.2;
      place(R.tetangga, -5, -11, Math.PI - 0.4);
      place(R.tetangga2, -16, -11.5, Math.PI + 0.5);
      return cam([-8, 4.5, -2], [-8.5, 4.2, -3], [-8, 1.2, -24], [-8.5, 1.2, -25])(t);
  } },
  // S22 — mata Bima berbinar: runtuhan itu... JEMBATAN!
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 40, env: { storm: 0.3, sunset: 0.25 }, waterY: 0.35 });
      place(R.bima, -9.2, -11, Math.PI + 0.25);
      const idea = smoother(frac(t, 0.3, 0.5));
      R.bimaHead.rotation.x = lerp(0.25, -0.3, idea);
      R.armR.rotation.x = lerp(0, -2.7, idea); // menunjuk jembatan masa depan
      place(R.tetangga, -5.2, -10.6, Math.PI - 0.3); R.tetanggaHead.rotation.y = -0.4;
      place(R.bebek, -13.8, -11.2, Math.PI);
      return cam([-15, 3.8, -1], [-14.5, 3.6, -2], [-9.8, 1.4, -15], [-10, 1.4, -16])(t);
  } },
  // S23 — semua bekerja: susun balok runtuhan jadi jembatan darurat
  { pose: (t, R, f) => {
      const prog = frac(t, 0.15, 0.95);
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 70, env: { storm: 0.15, sunset: 0.35 }, waterY: 0.35, bridge: Math.max(0.02, prog) });
      const carry = Math.abs(Math.sin(f * 0.3));
      place(R.monster, -13.5, -12.5, 2.9); R.mArmL.rotation.x = -1.8 - carry * 0.3; R.mArmR.rotation.x = -1.8 - carry * 0.3;
      place(R.tetangga, -6.5, -13.5, Math.PI + 0.2); carryArms(R.tArmL, R.tArmR);
      R.tetangga.position.y = Math.abs(Math.sin(f * 0.32)) * 0.06;
      place(R.bima, -10.5, -14.2, Math.PI); R.armL.rotation.x = -1.4; R.armR.rotation.x = -1.4;
      return cam([-1, 5.5, 1], [-2, 5.2, 0], [-10.5, 1.2, -17], [-10.5, 1.2, -18])(t);
  } },
  // S24 — jembatan selesai tepat saat air paling tinggi
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 100, env: { sunset: 0.45 }, waterY: 0.3, bridge: 1 });
      place(R.bima, -13.8, -13.8, -2.6); cheerArms(R.armL, R.armR, t, f * 0.26);
      place(R.monster, -6.2, -13.6, 2.7); R.mArmL.rotation.z = 0.5; R.mArmR.rotation.z = -0.5;
      place(R.tetangga, -15.5, -11, -2.2);
      return cam([-3, 5, 2], [-4, 4.8, 1], [-10.3, 1.3, -19], [-10.3, 1.3, -20])(t);
  } },
  // S25 — Monster menguji jembatan dengan langkah terberat
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { sunset: 0.55 }, waterY: 0.25, bridge: 1 });
      const walk = smoother(frac(t, 0.1, 0.85));
      const p = lerp3([-10, 0, -13.2], [-10, 0, -26.8], walk);
      place(R.monster, p[0], p[2], Math.PI, 0.95);
      if (walk > 0.02 && walk < 0.98) {
        swingLimbs(R.mArmL, R.mArmR, R.mLegL, R.mLegR, f * 0.28, 0.3);
        R.monster.position.y = 0.95 + Math.abs(Math.sin(f * 0.28)) * 0.08;
      }
      place(R.bima, -13.6, -13.4, -2.7); R.bimaHead.rotation.x = -0.15;
      return cam([-2.5, 4.6, -6], [-3, 4.4, -7], [-10, 1.6, -20], [-10, 1.6, -20.5])(t);
  } },
  // S26 — warga menyeberang berbaris rapi di atas jembatan
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { sunset: 0.6 }, waterY: 0.22, bridge: 1 });
      const cross = (off: number) => smoother(frac(t, off, off + 0.55));
      const pa = lerp3([-11.2, 0, -27.5], [-11.2, 0, -12.5], cross(0.05));
      place(R.ayam, pa[0], pa[2], 0, 0.95); R.ayam.position.y = 0.95 + Math.abs(Math.sin(f * 0.4)) * 0.07;
      const pb = lerp3([-9, 0, -27.8], [-9, 0, -12.8], cross(0.2));
      place(R.bebek, pb[0], pb[2], 0, 0.95); R.bebek.position.y = 0.95 + Math.abs(Math.sin(f * 0.38)) * 0.07;
      const pk = lerp3([-10.2, 0, -27.2], [-10.2, 0, -12.2], cross(0.35));
      place(R.kelinci, pk[0], pk[2], 0, 0.95); R.kelinci.position.y = 0.95 + Math.abs(Math.sin(f * 0.45)) * 0.1;
      place(R.bima, -13.4, -12.8, -2.8); R.armR.rotation.x = -2.6; // melambai menyambut
      return cam([-3.5, 4.4, -7], [-4, 4.2, -8], [-10.2, 1.5, -20], [-10.2, 1.5, -20])(t);
  } },
  // S27 — Sapi dan anaknya menyeberang terakhir, jembatan berderit tapi kokoh
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { sunset: 0.6 }, waterY: 0.2, bridge: 1 });
      const walk = smoother(frac(t, 0.08, 0.9));
      const p = lerp3([-10.4, 0, -27.6], [-10.4, 0, -12.4], walk);
      place(R.sapi, p[0], p[2], 0, 0.95);
      R.sapi.position.y = 0.95 + Math.abs(Math.sin(f * 0.2)) * 0.04;
      R.sapiHead.rotation.x = 0.12;
      const p2 = lerp3([-8.6, 0, -28.4], [-8.6, 0, -13.2], smoother(frac(t, 0.2, 0.98)));
      place(R.sapiAnak, p2[0], p2[2], 0, 0.95); R.sapiAnak.position.y = 0.95 + Math.abs(Math.sin(f * 0.34)) * 0.06;
      place(R.bima, -13.4, -12.6, -2.8); place(R.monster, -4.2, -9.8, 2.8);
      return cam([-1.5, 4.6, -5.5], [-2, 4.4, -6.5], [-10.2, 1.6, -20.5], [-10.2, 1.6, -20.5])(t);
  } },
  // S28 — sorak sorai! hujan reda, matahari sore muncul
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        stormX: 160, env: { sunset: 0.75 }, waterY: 0.05, bridge: 1 });
      place(R.bima, -13.2, -11.5, -2.9); cheerArms(R.armL, R.armR, t, f * 0.3);
      R.bima.position.y = Math.abs(Math.sin(f * 0.3)) * 0.15;
      place(R.tetangga, -6.8, -11.2, 2.9); cheerArms(R.tArmL, R.tArmR, t, f * 0.28);
      place(R.tetangga2, -15.5, -9.5, -2.4); cheerArms(R.t2ArmL, R.t2ArmR, t, f * 0.32);
      place(R.monster, -4.5, -10.5, 2.6); R.mArmL.rotation.set(-2.8, 0, 0.5); R.mArmR.rotation.set(-2.8, 0, -0.5);
      place(R.ayam, -11, -12.2, 0.2); R.ayam.position.y = Math.abs(Math.sin(f * 0.36)) * 0.12;
      place(R.kelinci, -8.5, -12.4, 0.1); R.kelinci.position.y = Math.abs(Math.sin(f * 0.4)) * 0.14;
      return cam([0, 5.5, 3], [-1, 5.2, 2], [-10, 1.8, -14], [-10, 1.8, -15])(t);
  } },
  // S29 — malam: warga tidur di balai; jembatan dijaga bergantian
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { dark: 0.85 }, waterY: -0.4, bridge: 1 });
      // penjaga di jembatan (Tetangga berdiri dengan lentera sikap siaga)
      place(R.tetangga, -12.5, -14.5, Math.PI + 0.4);
      R.tetanggaHead.rotation.y = Math.sin(f * 0.04) * 0.4;
      // yang lain beristirahat di depan balai (duduk = skala y kecil)
      place(R.bima, 21, 10.5, -2.6); R.bima.scale.y = 0.78; R.bimaHead.rotation.x = 0.3;
      place(R.monster, 24.5, 11.5, -2.9); R.monster.scale.y = 0.8; R.monsterHead.rotation.x = 0.3;
      place(R.ayam, 19.5, 11.8, 0.2); R.ayamHead.rotation.x = 0.45;
      place(R.kelinci, 18.2, 10.8, 0.4); R.kelinciHead.rotation.x = 0.4;
      return cam([14, 3.6, 20], [15, 3.4, 19], [21.5, 1.2, 10.5], [21, 1.2, 10.8])(t);
  } },
  // S30 — juri mengumumkan: juara adalah... menara yang sudah tidak berdiri!
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { sunset: 0.35 }, waterY: -0.5, bridge: 1 });
      place(R.tetangga2, 0, 6.5, 0); // juri di tengah lapangan
      const announce = smoother(frac(t, 0.35, 0.55));
      R.t2ArmR.rotation.x = lerp(-0.4, -2.7, announce); // menunjuk ke arah jembatan
      place(R.bima, -4.5, 7.5, -0.4); R.bimaHead.rotation.x = -0.1;
      place(R.tetangga, 4.5, 7.8, -0.5);
      place(R.monster, 8.5, 8.5, -0.6);
      place(R.kelinci, -8, 8.8, 0.2);
      const cheer = smoother(frac(t, 0.6, 0.8));
      if (cheer > 0) { cheerArms(R.armL, R.armR, t, f * 0.3); R.bima.position.y = Math.abs(Math.sin(f * 0.3)) * 0.14 * cheer; }
      return cam([1, 5, 22], [0.5, 4.8, 21], [0, 2, 2], [-1, 2, 0])(t);
  } },
  // S31 — makan malam perayaan di balai: sup wortel untuk semua
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { dark: 0.8 }, waterY: -0.5, bridge: 1 });
      place(R.bima, 21.2, 11.3, Math.PI); R.bimaHead.rotation.x = 0.25 + Math.sin(f * 0.07) * 0.06;
      place(R.monster, 24.2, 11.2, Math.PI); R.monsterHead.rotation.x = 0.25;
      place(R.tetangga, 20, 8.2, 0.1); R.tetanggaHead.rotation.x = 0.2;
      place(R.kelinci, 24.6, 8.4, -0.3); R.kelinciHead.rotation.x = 0.3;
      place(R.ayam, 22.4, 8.1, 0); R.ayamHead.rotation.x = 0.35 + Math.sin(f * 0.09) * 0.08;
      return cam([22.3, 4.6, 1.5], [22.3, 4.4, 2.5], [22.4, 1.2, 9.8], [22.4, 1.2, 10])(t);
  } },
  // S32 — Bima memasang bendera juara di tengah jembatan
  { pose: (t, R, f) => {
      const raise = smoother(frac(t, 0.2, 0.6));
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: {}, waterY: -0.55, bridge: 1, bridgeFlagOn: raise > 0.05 });
      R.bridgeFlag.scale.y = Math.max(0.05, raise);
      place(R.bima, -11.8, -18.6, -2.6, 0.95);
      R.armR.rotation.x = -2.5; R.bimaHead.rotation.x = -0.3;
      place(R.kelinci, -13.2, -13.8, -2.9);
      place(R.ayam, -7.2, -13.6, 2.9); R.ayam.position.y = Math.abs(Math.sin(f * 0.33)) * 0.1;
      const cloth = R.bridgeFlag.getObjectByName("flagCloth");
      if (cloth) cloth.rotation.y = Math.sin(f * 0.12) * 0.3;
      return cam([-3.5, 4.2, -8], [-4, 4, -9], [-10.2, 1.8, -19.5], [-10.2, 1.9, -20])(t);
  } },
  // S33 — keesokan hari: gotong royong memperkuat jembatan (pagar dipasang)
  { pose: (t, R, f) => {
      const rails = smoother(frac(t, 0.3, 0.8)) > 0.4;
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: {}, waterY: -0.6, bridge: 1, rails, bridgeFlagOn: true });
      const work = Math.abs(Math.sin(f * 0.16));
      place(R.bima, -12.3, -17, -1.4, 0.95); R.armR.rotation.x = -1.2 - work * 0.7;
      place(R.tetangga, -7.8, -21.5, 1.8, 0.95); R.tArmL.rotation.x = -1.2 - work * 0.7;
      place(R.monster, -12.6, -23.5, -2.8); carryArms(R.mArmL, R.mArmR);
      place(R.kelinci, -7.5, -14.8, 2.8);
      return cam([-2.5, 4.8, -7], [-3, 4.6, -8], [-10.2, 1.4, -19.5], [-10.2, 1.4, -20])(t);
  } },
  // S34 — piknik pertama anak-anak di tengah jembatan baru
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: {}, waterY: -0.6, bridge: 1, rails: true, bridgeFlagOn: true, picnic: true });
      place(R.ayam, -11.3, -17.6, 2.6, 0.95); R.ayamHead.rotation.x = 0.3 + Math.sin(f * 0.1) * 0.07;
      place(R.bebek, -8.8, -18.4, -2.7, 0.95); R.bebekHead.rotation.x = 0.3;
      place(R.kelinci, -10.1, -16.2, 3.0, 0.95); R.kelinciHead.rotation.x = 0.28;
      place(R.bima, -13.5, -14.2, -2.7); R.bimaHead.rotation.x = -0.12;
      return cam([-4.5, 3.8, -9.5], [-5, 3.6, -10.5], [-10.1, 1.5, -18.6], [-10.1, 1.5, -19])(t);
  } },
  // S35 — setiap warga menepuk balok jembatan sambil tersenyum
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { sunset: 0.3 }, waterY: -0.6, bridge: 1, rails: true, bridgeFlagOn: true });
      const walk = smoother(frac(t, 0.05, 0.5));
      const p = lerp3([-11, 0, -25.5], [-11, 0, -21.5], walk);
      place(R.bebek, p[0], p[2], 0, 0.95);
      const pat = Math.sin(frac(t, 0.55, 0.8) * Math.PI);
      R.bebekHead.rotation.x = 0.15 + pat * 0.3; // menepuk dengan paruh/kepala menunduk
      place(R.bima, -8.6, -22.5, 0.5, 0.95); R.bimaHead.rotation.x = -0.1;
      R.armL.rotation.z = 0.4;
      return cam([-4, 3.8, -13], [-4.5, 3.6, -14], [-10.3, 1.4, -21.5], [-10.5, 1.4, -22])(t);
  } },
  // S36 — Bima menggambar rencana menara tahun depan... miring ke sungai
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { sunset: 0.5 }, waterY: -0.6, bridge: 1, rails: true, bridgeFlagOn: true });
      place(R.bima, 8, 10.8, 0.3);
      carryArms(R.armL, R.armR); // memegang papan gambar
      R.bimaHead.rotation.x = 0.3 + Math.sin(frac(t, 0.5, 0.7) * Math.PI) * -0.45; // lalu tertawa mendongak
      place(R.monster, 11.4, 11.2, -0.35); R.monsterHead.rotation.x = 0.15;
      place(R.kelinci, 5.2, 11.4, 0.4); R.kelinciHead.rotation.x = -0.15;
      return cam([8.3, 3.4, 18.5], [8.3, 3.2, 17.5], [8.4, 1.5, 10.9], [8.4, 1.6, 11.1])(t);
  } },
  // S37 — malam berbintang di jembatan: menara tertinggi adalah yang menghubungkan
  { pose: (t, R, f) => {
      stage(R, { bimaFallen: 1, tetanggaFallen: 1, monsterLayers: 3, kelinciTower: true,
        env: { dark: 0.92 }, waterY: -0.6, bridge: 1, rails: true, bridgeFlagOn: true });
      place(R.bima, -11.5, -19.5, Math.PI, 0.95); R.bimaHead.rotation.x = -0.5; // memandang bintang
      place(R.monster, -8.2, -20.5, Math.PI, 0.95); R.monsterHead.rotation.x = -0.45;
      place(R.kelinci, -13.2, -21, Math.PI, 0.95); R.kelinciHead.rotation.x = -0.5;
      const cloth = R.bridgeFlag.getObjectByName("flagCloth");
      if (cloth) cloth.rotation.y = Math.sin(f * 0.05) * 0.15;
      return cam([-4.5, 3.4, -10], [-6, 3.8, -12.5], [-10.3, 2.2, -20], [-10.3, 2.6, -20.5])(t);
  } },
];

export function poseFrame(frame: number, R: MenaraRefs, camera: THREE.Camera) {
  resetAll(R);
  // Tentukan adegan dari frame (rentang mengikuti timing kata final).
  let k = 1;
  for (let i = 1; i <= 37; i++) {
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
}
