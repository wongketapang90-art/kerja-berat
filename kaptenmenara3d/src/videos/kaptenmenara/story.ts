import * as THREE from "three";
import { WorldRefs, CharRefs, WALL_Z, CAT_HOME, PEDESTAL_POS, PEDESTAL_TOP } from "./world";
import { clamp01, smoother, lerp, lerp3 } from "./vox";

// ============================================================================
// KaptenMenara — BUKTI LANSKAP 30 detik (900 frame, 6 shot x 150 frame).
// Bukan episode: satu rangkaian shot lebar yang membuktikan framing 16:9
// Kota Mainan yang diperluas — establishing selebar kota, lari lateral,
// gag bayangan dalam wide shot, twist kucing, hormat, dan pull-back akhir.
// Pose/gerak memakai ulang pola story potret (wargaPanic/Cheer/HoldBreath,
// kaptenRun, catLick, holdLamp) dengan kamera yang dirancang untuk lanskap:
// dolly lateral jauh, fov 40, subjek dibaca dalam komposisi lebar.
// Pada produksi sungguhan, story episode ditulis per SEG dari timing audio
// (pola yang sama seperti story.ts potret & BimaMenara).
// ============================================================================

type V3 = [number, number, number];
const frac = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

interface Shot { a: number; b: number; pose: (t: number, R: WorldRefs) => { pos: V3; look: V3 } }

const STAND: V3 = [-0.6, 0, 1.2];                       // Kapten's hero spot
const ADVANCE: V3 = [1.4, 0, -3.4];                     // where he stops near the lamp
const WARGA_HOME: { p: V3; ry: number }[] = [
  { p: [-11.5, 0, 3.8], ry: Math.PI - 0.25 },
  { p: [-6.2, 0, 6.1], ry: Math.PI + 0.1 },
  { p: [-0.8, 0, 6.3], ry: Math.PI + 0.15 },
  { p: [2.7, 0, 5.9], ry: Math.PI - 0.15 },
  { p: [8.6, 0, 3.4], ry: Math.PI + 0.3 },
  { p: [13.5, 0, 5.6], ry: Math.PI - 0.35 },
];

const rot2 = (x: number, z: number, th: number): [number, number] =>
  [x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)];

function charReset(c: CharRefs, p: V3, ry: number) {
  c.g.position.set(...p); c.g.rotation.set(0, ry, 0);
  c.armL.rotation.set(0, 0, 0.12); c.armR.rotation.set(0, 0, -0.12);
  c.legL.rotation.set(0, 0, 0); c.legR.rotation.set(0, 0, 0);
  c.head.rotation.set(0, 0, 0);
}

function resetAll(R: WorldRefs) {
  charReset(R.kapten, STAND, 2.2);
  R.warga.forEach((w, i) => charReset(w, WARGA_HOME[i].p, WARGA_HOME[i].ry));
  R.cat.position.set(...CAT_HOME); R.cat.rotation.set(0, 0.35, 0);
  R.catHead.rotation.set(0, 0, 0);
  R.catPawR.rotation.set(0, 0, 0);
  R.catTail.rotation.set(0, 0, 0);
  R.shadow.position.set(3.2, 0, WALL_Z); R.shadow.rotation.set(0, 0, 0); R.shadow.scale.setScalar(1);
  R.shadowJaw.rotation.set(0, 0, 0);
  R.shadowFangs.visible = true; R.shadowFangs.scale.setScalar(1);
  R.lampLight.intensity = 30;
  R.handLamp.visible = false; R.handLampLight.intensity = 0;
}

function wargaPanic(R: WorldRefs, t: number, amp = 1) {
  R.warga.forEach((w, i) => {
    const ph = i * 1.7;
    w.armL.rotation.z = 2.55 + Math.sin(t * Math.PI * 5 + ph) * 0.35 * amp;
    w.armR.rotation.z = -2.55 - Math.cos(t * Math.PI * 5 + ph) * 0.35 * amp;
    w.armL.rotation.x = -0.3; w.armR.rotation.x = -0.3;
    w.g.position.y = Math.abs(Math.sin(t * Math.PI * 4 + ph)) * 0.16 * amp;
    w.head.rotation.x = -0.32;
  });
}
function wargaHoldBreath(R: WorldRefs, frame: number) {
  R.warga.forEach((w, i) => {
    w.armL.rotation.set(-2.35, 0, 0.55); w.armR.rotation.set(-2.35, 0, -0.55);
    w.g.position.x = WARGA_HOME[i].p[0] + Math.sin(frame * 1.6 + i * 2.3) * 0.022;
    w.head.rotation.x = 0.18;
  });
}
function wargaCheer(R: WorldRefs, t: number) {
  R.warga.forEach((w, i) => {
    const ph = i * 1.3;
    w.g.position.y = Math.abs(Math.sin(t * Math.PI * 3.4 + ph)) * 0.13;
    w.armL.rotation.z = 1.9 + Math.sin(t * Math.PI * 4 + ph) * 0.4;
    w.armR.rotation.z = -1.9 - Math.cos(t * Math.PI * 4 + ph) * 0.4;
    w.head.rotation.x = -0.22;
  });
}

function holdLamp(R: WorldRefs, lx: number, ly: number, lz: number, intensity: number) {
  const k = R.kapten;
  const [ox, oz] = rot2(lx, lz, k.g.rotation.y);
  R.handLamp.visible = true;
  R.handLamp.position.set(k.g.position.x + ox, ly, k.g.position.z + oz);
  R.handLamp.rotation.set(0, k.g.rotation.y, 0);
  R.handLampLight.intensity = intensity;
}

function kaptenRun(R: WorldRefs, t: number, freq: number, amp: number, lean = 0.12) {
  const s = Math.sin(t * Math.PI * 2 * freq);
  R.kapten.legL.rotation.x = s * amp; R.kapten.legR.rotation.x = -s * amp;
  R.kapten.armL.rotation.x = -s * amp * 0.8; R.kapten.armR.rotation.x = s * amp * 0.8;
  R.kapten.g.position.y = Math.abs(Math.cos(t * Math.PI * 2 * freq)) * 0.09;
  R.kapten.g.rotation.x = lean;
}

function catLick(R: WorldRefs, t: number, rate = 2) {
  R.catPawR.rotation.x = -1.95 + Math.sin(t * Math.PI * 2 * rate) * 0.16;
  R.catHead.rotation.x = 0.38 + Math.sin(t * Math.PI * 2 * rate + 0.6) * 0.07;
  R.catTail.rotation.y = Math.sin(t * Math.PI * 2) * 0.18;
}

export const SHOTS: Shot[] = [
  // 1 — ESTABLISHING LEBAR (0-149): dolly lateral melintasi seluruh kota;
  // menara + bayangan monster di kanan, rumah-rumah sayap di kiri, warga panik.
  {
    a: 0, b: 149,
    pose: (t, R) => {
      wargaPanic(R, t, 0.7);
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 4)) * 0.38;
      R.shadow.rotation.z = Math.sin(t * Math.PI * 2) * 0.018;
      catLick(R, t, 1);
      const k = smoother(t);
      return { pos: lerp3([-17, 6.0, 27], [-5, 5.2, 25], k), look: [3.5, 3.0, -11] };
    },
  },
  // 2 — LARI LATERAL (150-299): Kapten berlari jauh menyusuri PLAZA (jalur
  // terbuka z~-3.5) dari sayap barat ke tengah; kamera tracking tinggi dari
  // tenggara — sightline melompati kepala warga, tanpa menabrak pepohonan
  // (tracking sejajar di jalur jalan/sisi utara terbukti tertutup kanopi
  // dan rumah sayap; lihat laporan).
  {
    a: 150, b: 299,
    pose: (t, R) => {
      const g = smoother(frac(t, 0, 0.85));
      const kp = lerp3([-15, 0, -1.8], [-2.5, 0, -1.8], g);
      R.kapten.g.position.set(kp[0], 0, kp[2]);
      if (t < 0.85) { R.kapten.g.rotation.y = 1.15; kaptenRun(R, t, 4.2, 0.75); }
      else { R.kapten.g.position.y = 0; R.kapten.g.rotation.x = 0; R.kapten.g.rotation.y = lerp(1.15, 2.2, frac(t, 0.85, 1)); }
      R.warga.forEach((w) => { w.armL.rotation.z = 1.2; w.armR.rotation.z = -1.2; w.head.rotation.y = -0.5; });
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 4)) * 0.35;
      return { pos: [kp[0] + 8, 5.5, 8], look: [kp[0], 1.5, kp[2]] };
    },
  },
  // 3 — GAG BAYANGAN, WIDE (300-449): Kapten mengangkat lampu besar; bayangan
  // membesar di dinding menara; warga menahan napas membentang selebar frame.
  {
    a: 300, b: 449,
    pose: (t, R) => {
      R.kapten.g.position.set(...STAND);
      R.kapten.g.rotation.y = 2.2;
      const raise = smoother(frac(t, 0.05, 0.4));
      R.kapten.armR.rotation.x = lerp(-0.3, -2.25, raise);
      R.kapten.armR.rotation.z = -0.25;
      R.kapten.armL.rotation.x = lerp(0, -1.5, raise); R.kapten.armL.rotation.z = 0.45;
      R.kapten.legL.rotation.x = 0.16; R.kapten.legR.rotation.x = -0.12;
      R.kapten.head.rotation.x = -0.14;
      holdLamp(R, 0.82, lerp(1.1, 2.15, raise), 0.5, lerp(0, 30, smoother(frac(t, 0.25, 0.55))));
      const grow = smoother(frac(t, 0.15, 0.9));
      R.shadow.scale.setScalar(lerp(1, 1.22, grow));
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 7)) * 0.55;
      wargaHoldBreath(R, Math.round(t * 150) + 300);
      const k = smoother(t);
      return { pos: lerp3([-4.5, 4.4, 19.5], [-3.6, 4.2, 18.0], k), look: [2.2, 3.4, -9] };
    },
  },
  // 4 — TWIST (450-599): Kapten jongkok di dekat lampu kota; "monster" ternyata
  // kucing kecil yang menjilati kakinya. Medium shot — wajah Kapten terbaca.
  {
    a: 450, b: 599,
    pose: (t, R) => {
      R.kapten.g.position.set(...ADVANCE); R.kapten.g.rotation.y = 2.73;
      R.kapten.g.position.y = -0.12; R.kapten.g.rotation.x = 0.14;
      R.kapten.armR.rotation.x = -0.55;
      holdLamp(R, 0.78, 0.85, 0.35, 10);
      catLick(R, t, 2);
      R.lampLight.intensity = 36;
      R.shadow.scale.setScalar(1.22);
      R.shadowJaw.rotation.x = 0.06;
      R.shadow.rotation.z = Math.sin(t * Math.PI * 2) * 0.006;
      R.warga.forEach((w) => { w.armL.rotation.z = 0.9; w.armR.rotation.z = -0.9; w.head.rotation.y = 0.4; });
      const k = smoother(t);
      // frontal-wide medium: Kapten (jongkok, kiri) + kucing (tengah) +
      // pedestal (kanan) — kamera potret lama terlalu dekat ke pedestal
      return { pos: lerp3([7.9, 2.3, 1.9], [7.3, 2.1, 1.3], k), look: [2.2, 1.0, -8.0] };
    },
  },
  // 5 — PEMBAYARAN (600-749): kucing duduk bangga di pedestal penjaga lampu,
  // bayangan menyusut tanpa taring, Kapten hormat, warga bersorak selebar jalan.
  {
    a: 600, b: 749,
    pose: (t, R) => {
      wargaCheer(R, t);
      R.shadow.scale.setScalar(0.78); R.shadowFangs.scale.setScalar(0.01); R.shadowJaw.rotation.x = 0.05;
      R.cat.position.set(PEDESTAL_POS[0], PEDESTAL_TOP, PEDESTAL_POS[2]);
      R.cat.rotation.y = 0.45;
      R.catHead.rotation.x = -0.14;
      R.catTail.rotation.y = Math.sin(t * Math.PI * 4) * 0.25;
      R.kapten.g.position.set(3.1, 0, -4.3);
      R.kapten.g.rotation.y = 0.95;
      R.kapten.armL.rotation.x = -0.2;
      R.kapten.armR.rotation.x = -2.8; R.kapten.armR.rotation.z = -0.4;   // salute
      const k = smoother(t);
      // Kapten kiri, pedestal+kucing kanan — jangan sejajar, kucing tertutup
      return { pos: lerp3([-2.2, 3.2, 6.0], [-1.2, 3.0, 7.2], k), look: [4.9, 1.5, -6.2] };
    },
  },
  // 6 — PULL-BACK PENUTUP (750-899): kamera mundur melebar — seluruh Kota
  // Mainan dalam satu frame: sayap rumah, barisan belakang, bukit, awan.
  {
    a: 750, b: 899,
    pose: (t, R) => {
      wargaCheer(R, t * 0.7);
      R.shadow.scale.setScalar(0.78); R.shadowFangs.scale.setScalar(0.01); R.shadowJaw.rotation.x = 0.05;
      R.cat.position.set(PEDESTAL_POS[0], PEDESTAL_TOP, PEDESTAL_POS[2]);
      R.cat.rotation.y = 0.45;
      R.catHead.rotation.x = -0.14;
      R.kapten.g.position.set(3.1, 0, -4.3);
      R.kapten.g.rotation.y = 0.95;
      R.kapten.armR.rotation.x = -2.8; R.kapten.armR.rotation.z = -0.4;
      catLick(R, t, 0.7);
      const k = smoother(t);
      return { pos: lerp3([0, 4.5, 15], [0, 9.5, 40], k), look: [0.5, 3.2, -9] };
    },
  },
];

export function poseFrame(frame: number, R: WorldRefs, camera: THREE.Camera) {
  resetAll(R);
  let shot = SHOTS[0];
  for (const s of SHOTS) {
    if (frame >= s.a) shot = s;
    if (frame >= s.a && frame <= s.b) break;
  }
  const t = frac(frame, shot.a, shot.b);
  const { pos, look } = shot.pose(t, R);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  // gentle street-lamp glow breathing + slow cloud drift (ambient life)
  const s = 1 + Math.sin(frame * 0.11) * 0.04;
  R.lampGlow.scale.setScalar(s);
  R.clouds.position.x = Math.sin(frame * 0.004) * 2.2;
}
