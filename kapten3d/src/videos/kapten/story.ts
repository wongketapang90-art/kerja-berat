import * as THREE from "three";
import { SEG } from "./timing";
import { WorldRefs, CharRefs, WALL_Z, LAMP_POS, CAT_HOME, PEDESTAL_POS, PEDESTAL_TOP } from "./world";
import { clamp01, smoother, lerp, lerp3 } from "./vox";

// ============================================================================
// Kapten Blok 3D UJI 1: "Menyelamatkan Kucing dari Bayangan Raksasa"
// Format uji pendek: 20-30 dtk, shot 2-4 dtk, hook (bayangan monster + warga
// panik) di 0-2 dtk pertama, twist (kucing kecil di depan lampu kota)
// mendarat >=3 dtk sebelum akhir. Shot diturunkan dari SEG (timing audio).
// ============================================================================

type V3 = [number, number, number];
const frac = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

interface Shot { a: number; b: number; pose: (t: number, R: WorldRefs) => { pos: V3; look: V3 } }

const STAND: V3 = [-0.6, 0, 1.2];                       // Kapten's hero spot
const ADVANCE: V3 = [1.4, 0, -3.4];                     // where he stops in S4a
const WARGA_HOME: { p: V3; ry: number }[] = [
  { p: [-8.6, 0, 3.6], ry: Math.PI - 0.25 },
  { p: [-0.8, 0, 6.3], ry: Math.PI + 0.15 },
  { p: [2.7, 0, 5.9], ry: Math.PI - 0.15 },
  { p: [8.6, 0, 3.4], ry: Math.PI + 0.3 },
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
  charReset(R.kapten, [-14, 0, 2], Math.PI / 2);
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

// Warga panik: arms up waving + little hops, heads tilted up at the wall.
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
// Warga menahan napas: hands to mouths, trembling, frozen.
function wargaHoldBreath(R: WorldRefs, frame: number) {
  R.warga.forEach((w, i) => {
    w.armL.rotation.set(-2.35, 0, 0.55); w.armR.rotation.set(-2.35, 0, -0.55);
    w.g.position.x = WARGA_HOME[i].p[0] + Math.sin(frame * 1.6 + i * 2.3) * 0.022;
    w.head.rotation.x = 0.18;
  });
}
// Warga tertawa/bersorak: happy bounces, arms waving mid-height.
function wargaCheer(R: WorldRefs, t: number) {
  R.warga.forEach((w, i) => {
    const ph = i * 1.3;
    w.g.position.y = Math.abs(Math.sin(t * Math.PI * 3.4 + ph)) * 0.13;
    w.armL.rotation.z = 1.9 + Math.sin(t * Math.PI * 4 + ph) * 0.4;
    w.armR.rotation.z = -1.9 - Math.cos(t * Math.PI * 4 + ph) * 0.4;
    w.head.rotation.x = -0.22;
  });
}

// Kapten's big hand lamp, held in his right hand at a root-local offset.
function holdLamp(R: WorldRefs, lx: number, ly: number, lz: number, intensity: number) {
  const k = R.kapten;
  const [ox, oz] = rot2(lx, lz, k.g.rotation.y);
  R.handLamp.visible = true;
  R.handLamp.position.set(k.g.position.x + ox, ly, k.g.position.z + oz);
  R.handLamp.rotation.set(0, k.g.rotation.y, 0);
  R.handLampLight.intensity = intensity;
}

// Run/walk cycle on Kapten: freq = full cycles per shot, amp = leg swing.
function kaptenRun(R: WorldRefs, t: number, freq: number, amp: number, lean = 0.12) {
  const s = Math.sin(t * Math.PI * 2 * freq);
  R.kapten.legL.rotation.x = s * amp; R.kapten.legR.rotation.x = -s * amp;
  R.kapten.armL.rotation.x = -s * amp * 0.8; R.kapten.armR.rotation.x = s * amp * 0.8;
  R.kapten.g.position.y = Math.abs(Math.cos(t * Math.PI * 2 * freq)) * 0.09;
  R.kapten.g.rotation.x = lean;
}

// The cat licking its paw: paw raised to the face, head bowed to meet it.
function catLick(R: WorldRefs, t: number, rate = 2) {
  R.catPawR.rotation.x = -1.95 + Math.sin(t * Math.PI * 2 * rate) * 0.16;
  R.catHead.rotation.x = 0.38 + Math.sin(t * Math.PI * 2 * rate + 0.6) * 0.07;
  R.catTail.rotation.y = Math.sin(t * Math.PI * 2) * 0.18;
}

const mid = (s: { a: number; b: number }) => Math.round((s.a + s.b) / 2);
const mid55 = (s: { a: number; b: number }) => Math.round(s.a + (s.b - s.a) * 0.55);

export const SHOTS: Shot[] = [
  // 1 — HOOK (S1a): warga panik, bayangan monster bergerak di dinding menara
  {
    a: SEG.s1.a, b: mid(SEG.s1),
    pose: (t, R) => {
      wargaPanic(R, t);
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 4)) * 0.38;
      R.shadow.rotation.z = Math.sin(t * Math.PI * 2) * 0.018;
      catLick(R, t, 1);
      const k = smoother(t);
      return { pos: lerp3([0.6, 4.6, 17.5], [0.9, 3.6, 14.2], k), look: [1.0, 2.4, -9] };
    },
  },
  // 2 — HOOK LANJUTAN (S1b): close-up kepala bayangan menganga
  {
    a: mid(SEG.s1) + 1, b: SEG.s1.b,
    pose: (t, R) => {
      wargaPanic(R, t, 0.7);
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 6)) * 0.55;
      R.shadow.rotation.z = Math.sin(t * Math.PI * 3) * 0.015;
      catLick(R, t, 1);
      const k = smoother(t);
      return { pos: lerp3([5.2, 6.6, -1.5], [4.7, 6.1, -3.2], k), look: [3.45, 6.3, WALL_Z] };
    },
  },
  // 3 — KAPTEN DATANG (S2a): berlari masuk dari kiri jalan
  {
    a: SEG.s2.a, b: mid(SEG.s2),
    pose: (t, R) => {
      const g = smoother(frac(t, 0, 0.78));
      const kp = lerp3([-13, 0, 2], STAND, g);
      R.kapten.g.position.set(kp[0], 0, kp[2]);
      R.kapten.g.rotation.y = 1.63;
      if (t < 0.78) kaptenRun(R, t, 3.2, 0.75); else { R.kapten.g.position.y = 0; R.kapten.g.rotation.x = 0; }
      R.warga.forEach((w) => { w.armL.rotation.z = 1.2; w.armR.rotation.z = -1.2; w.head.rotation.y = -0.5; });
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 4)) * 0.35;
      const k = smoother(t);
      return { pos: lerp3([-10.5, 3.2, 9.0], [-5.2, 2.8, 7.2], k), look: [kp[0] + 0.4, 1.5, kp[2]] };
    },
  },
  // 4 — JARGON (S2b): "Serahkan pada Kapten!" — lampu besar diangkat ke dinding
  {
    a: mid(SEG.s2) + 1, b: SEG.s2.b,
    pose: (t, R) => {
      const turn = smoother(frac(t, 0, 0.3));
      R.kapten.g.position.set(...STAND);
      R.kapten.g.rotation.y = lerp(1.63, 2.2, turn);
      const raise = smoother(frac(t, 0.08, 0.45));
      R.kapten.armR.rotation.x = lerp(-0.3, -2.25, raise);
      R.kapten.armR.rotation.z = -0.25;
      R.kapten.armL.rotation.x = lerp(0, -1.5, raise); R.kapten.armL.rotation.z = 0.45;
      R.kapten.legL.rotation.x = 0.16; R.kapten.legR.rotation.x = -0.12;
      R.kapten.head.rotation.x = -0.14;
      holdLamp(R, 0.82, lerp(1.1, 2.15, raise), 0.5, lerp(0, 30, smoother(frac(t, 0.3, 0.6))));
      R.warga.forEach((w) => { w.armL.rotation.z = 0.5; w.armR.rotation.z = -0.5; w.head.rotation.y = -0.4; });
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 4)) * 0.3;
      const k = smoother(t);
      return { pos: lerp3([3.4, 2.8, -3.6], [2.9, 2.55, -4.4], k), look: [STAND[0] + 0.1, 1.65, STAND[2]] };
    },
  },
  // 5 — MEMBESAR (S3a): bayangan membesar, gigi bergerak makin cepat
  {
    a: SEG.s3.a, b: mid(SEG.s3),
    pose: (t, R) => {
      R.kapten.g.position.set(...STAND); R.kapten.g.rotation.y = 2.2;
      R.kapten.armR.rotation.x = -2.25; R.kapten.armR.rotation.z = -0.25 + Math.sin(t * Math.PI * 9) * 0.02;
      R.kapten.armL.rotation.x = -1.5; R.kapten.armL.rotation.z = 0.45;
      holdLamp(R, 0.82, 2.15, 0.5, 30);
      const grow = smoother(t);
      R.shadow.scale.setScalar(lerp(1, 1.22, grow));
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 7)) * 0.55;
      wargaHoldBreath(R, Math.round(t * 90));
      const k = smoother(t);
      return { pos: lerp3([-1.8, 3.8, 8.6], [-1.5, 3.9, 7.6], k), look: [3.0, 6.0, WALL_Z] };
    },
  },
  // 6 — TAHAN NAPAS (S3b): warga gemetar menahan napas (dari sisi menara)
  {
    a: mid(SEG.s3) + 1, b: SEG.s3.b,
    pose: (t, R) => {
      R.kapten.g.position.set(...STAND); R.kapten.g.rotation.y = 2.2;
      R.kapten.armR.rotation.x = -2.25; R.kapten.armR.rotation.z = -0.25;
      R.kapten.armL.rotation.x = -1.5; R.kapten.armL.rotation.z = 0.45;
      holdLamp(R, 0.82, 2.15, 0.5, 28);
      R.shadow.scale.setScalar(1.22);
      R.shadowJaw.rotation.x = (0.5 + 0.5 * Math.sin(t * Math.PI * 7)) * 0.5;
      wargaHoldBreath(R, Math.round(t * 90) + 40);
      const k = smoother(t);
      return { pos: lerp3([2.6, 2.2, -5.2], [2.3, 2.1, -4.6], k), look: [0.8, 1.4, 6.0] };
    },
  },
  // 7 — MELANGKAH MAJU (S4a): Kapten berjalan mantap ke arah lampu kota
  {
    a: SEG.s4.a, b: mid(SEG.s4),
    pose: (t, R) => {
      const g = smoother(frac(t, 0.05, 0.9));
      const kp = lerp3(STAND, ADVANCE, g);
      R.kapten.g.position.set(kp[0], 0, kp[2]);
      R.kapten.g.rotation.y = lerp(2.2, 2.73, g);
      kaptenRun(R, t, 2.1, 0.5, 0.05);
      R.kapten.armR.rotation.x = -0.55; // lamp carried low at his side
      holdLamp(R, 0.78, 0.95, 0.35, 12);
      catLick(R, t, 1.4);
      R.shadow.scale.setScalar(1.22);
      R.shadowJaw.rotation.x = 0.12;
      R.warga.forEach((w) => { w.armL.rotation.z = 0.9; w.armR.rotation.z = -0.9; w.head.rotation.y = 0.4; });
      return { pos: [kp[0] + 5.6, 2.7, kp[2] + 5.6], look: [kp[0], 1.3, kp[2]] };
    },
  },
  // 8 — TWIST (S4b): kucing kecil di depan lampu kota, menjilati kakinya
  {
    a: mid(SEG.s4) + 1, b: SEG.s4.b,
    pose: (t, R) => {
      R.kapten.g.position.set(...ADVANCE); R.kapten.g.rotation.y = 2.73;
      R.kapten.g.position.y = -0.12; R.kapten.g.rotation.x = 0.14;   // crouching to look
      R.kapten.armR.rotation.x = -0.55;
      holdLamp(R, 0.78, 0.85, 0.35, 10);
      catLick(R, t, 2);
      R.lampLight.intensity = 36;
      R.shadow.scale.setScalar(1.22);
      R.shadowJaw.rotation.x = 0.06;                                 // "monster" holds still
      R.shadow.rotation.z = Math.sin(t * Math.PI * 2) * 0.006;
      const k = smoother(t);
      return { pos: lerp3([5.1, 1.6, -3.9], [4.7, 1.35, -4.8], k), look: [3.2, 0.95, -8.6] };
    },
  },
  // 9 — PEMBAYARAN 1 (S5a): monster menyusut jadi bayangan kucing; warga tertawa
  {
    a: SEG.s5.a, b: mid55(SEG.s5),
    pose: (t, R) => {
      R.kapten.g.position.set(...ADVANCE); R.kapten.g.rotation.y = 2.9;
      R.kapten.armR.rotation.x = -0.4;
      holdLamp(R, 0.78, 0.9, 0.35, 8);
      catLick(R, t, 1);
      const shrink = smoother(frac(t, 0.1, 0.75));
      R.shadow.scale.setScalar(lerp(1.22, 0.78, shrink));
      R.shadowFangs.scale.setScalar(Math.max(0.01, 1 - shrink * 1.4));
      R.shadowJaw.rotation.x = lerp(0.3, 0.05, shrink);
      wargaCheer(R, t);
      const k = smoother(t);
      return { pos: lerp3([0.5, 5.0, 16.5], [0.2, 4.7, 15.0], k), look: [1.4, 2.0, -5] };
    },
  },
  // 10 — PEMBAYARAN 2 (S5b): kucing diangkat ke pedestal penjaga lampu; hormat
  {
    a: mid55(SEG.s5) + 1, b: SEG.s5.b,
    pose: (t, R) => {
      wargaCheer(R, t);
      R.shadow.scale.setScalar(0.78); R.shadowFangs.scale.setScalar(0.01); R.shadowJaw.rotation.x = 0.05;
      // Kapten carries the cat from the lamp post to the pedestal
      const walk = smoother(frac(t, 0.05, 0.45));
      const kp = lerp3([3.7, 0, -7.4], [4.35, 0, -5.55], walk);
      R.kapten.g.position.set(kp[0], 0, kp[2]);
      R.kapten.g.rotation.y = lerp(0.5, 0.95, walk);
      if (t < 0.45) kaptenRun(R, t * 1.6, 1.6, 0.4, 0.04);
      R.kapten.armL.rotation.x = -1.85; R.kapten.armR.rotation.x = -1.85;  // cradling
      const place = smoother(frac(t, 0.45, 0.72));
      const inArms: V3 = [kp[0] + Math.sin(R.kapten.g.rotation.y) * 0.66, 1.18, kp[2] + Math.cos(R.kapten.g.rotation.y) * 0.66];
      const onPed: V3 = [PEDESTAL_POS[0], PEDESTAL_TOP, PEDESTAL_POS[2]];
      const cp = lerp3(inArms, onPed, place);
      R.cat.position.set(cp[0], cp[1], cp[2]);
      R.cat.rotation.y = lerp(R.kapten.g.rotation.y, 0.45, place);
      if (place >= 1) {
        // placed: Kapten steps back and salutes; the cat sits proud
        R.kapten.armL.rotation.x = -0.2;
        R.kapten.armR.rotation.x = -2.8; R.kapten.armR.rotation.z = -0.4;
        R.catHead.rotation.x = -0.14;
        R.catTail.rotation.y = Math.sin(t * Math.PI * 4) * 0.25;
      }
      const k = smoother(t);
      return { pos: lerp3([0.4, 2.9, 0.8], [-0.2, 3.1, 2.6], k), look: [4.9, 1.4, -6.2] };
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
  // gentle street-lamp glow breathing (props not driven by the shot keep life)
  const s = 1 + Math.sin(frame * 0.11) * 0.04;
  R.lampGlow.scale.setScalar(s);
}
