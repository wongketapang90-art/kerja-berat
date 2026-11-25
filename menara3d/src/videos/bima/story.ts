import * as THREE from "three";
import { SEG } from "./timing";
import { WorldRefs, LADDER_TOP, CLOUD_SEA_Y, NEST_POS } from "./world";
import { clamp01, smoother, lerp, lerp3 } from "./vox";

// ============================================================================
// Episode: "Bima Mengantar Anak Burung Pulang" (episode pertama standar 3D)
// CATATAN TIMING: SEG di timing.ts saat ini adalah ESTIMASI dari naskah
// (2,15 kata/detik). Timing FINAL menunggu audio asli (make_timing.py) —
// sesudah timing digenerate ulang, rentang frame shot di bawah ini WAJIB
// dicek ulang terhadap SEG baru (struktur shot mengikuti batas segmen).
// Blok pose memakai ulang pola patokan "Tangga": climbPose, antisipasi
// jongkok, wajah lelah, putar badan di atas awan, wide penutup.
// ============================================================================

type V3 = [number, number, number];
const frac = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

interface Shot { a: number; b: number; pose: (t: number, R: WorldRefs) => { pos: V3; look: V3 } }

const LAD_Z = -2; // ladder plane z
const CLIMB_Z = LAD_Z + 0.85; // Bima hangs on the front face of the ladder
const RIDE_Y = 2.62; // chick origin height above Bima's origin when riding his head
const CHICK_HOME: V3 = [NEST_POS[0] - 2.6, NEST_POS[1] - 0.5, NEST_POS[2] + 2.2]; // chick1 nest default
const CHICK2_HOME: V3 = [NEST_POS[0] + 3.1, NEST_POS[1] - 0.5, NEST_POS[2] + 2.4]; // chick2 nest default
const MAMA_HOME: V3 = [NEST_POS[0] + 0.5, NEST_POS[1] - 0.6, NEST_POS[2] - 0.5];
const CHICK_GROUND: V3 = [-10.5, -0.12, -5.5]; // fallen chick under the giant tree

function resetAll(R: WorldRefs) {
  const b = R.bima;
  b.position.set(0, 0, 0); b.rotation.set(0, 0, 0); b.scale.setScalar(1);
  R.armL.rotation.set(0, 0, 0.12); R.armR.rotation.set(0, 0, -0.12);
  R.legL.rotation.set(0, 0, 0); R.legR.rotation.set(0, 0, 0);
  R.bimaHead.rotation.set(0, 0, 0);
  R.headNormal.visible = true; R.headTired.visible = false;
  R.feather.visible = false;
  // mama + sibling back in the nest
  R.mama.position.set(...MAMA_HOME); R.mama.rotation.set(0, -0.9, 0);
  R.mamaHead.rotation.set(0, 0, 0);
  R.wingL.rotation.set(0, 0, 0.15); R.wingR.rotation.set(0, 0, -0.15);
  // the fallen chick starts under the tree, slumped
  // NOTE: buildBird baked scale 0.52 into chick1 — reset MUST restore 0.52, not 1
  R.chick1.position.set(...CHICK_GROUND); R.chick1.rotation.set(0.1, -0.6, 0.16); R.chick1.scale.setScalar(0.52);
  R.chickHead1.rotation.set(0.5, 0, 0);
  R.chickWingL1.rotation.set(0, 0, 0); R.chickWingR1.rotation.set(0, 0, 0);
  // sibling stays in the nest
  R.chick2.position.set(...CHICK2_HOME); R.chick2.rotation.set(0, -1.2, 0);
  R.chickHead2.rotation.set(0, 0, 0);
  R.chickWingL2.rotation.set(0, 0, 0); R.chickWingR2.rotation.set(0, 0, 0);
}

function climbPose(R: WorldRefs, phase: number, grip = 1) {
  // arms reach up alternately, legs step alternately, body bobs — phase in radians
  const s = Math.sin(phase), c = Math.cos(phase);
  R.armL.rotation.x = -2.6 * grip + s * 0.45;
  R.armR.rotation.x = -2.6 * grip - s * 0.45;
  R.armL.rotation.z = 0.25; R.armR.rotation.z = -0.25;
  R.legL.rotation.x = c * 0.55; R.legR.rotation.x = -c * 0.55;
  R.bima.position.y += Math.abs(Math.sin(phase)) * 0.07;
  R.bima.rotation.z = s * 0.03;
}

// Place the chick on top of Bima's head, facing the way Bima faces.
function rideChick(R: WorldRefs, headTiltX = 0, tremble = 0) {
  const b = R.bima;
  R.chick1.position.set(b.position.x, b.position.y + RIDE_Y * b.scale.y, b.position.z);
  R.chick1.rotation.set(0.08, b.rotation.y, tremble);
  R.chickHead1.rotation.set(headTiltX, 0, 0);
}

export const SHOTS: Shot[] = [
  // 1 — HOOK (S1a): wide village + giant tree; Bima finds the fallen chick, walks in and crouches
  {
    a: SEG.s1.a, b: Math.round((SEG.s1.a + SEG.s1.b) / 2),
    pose: (t, R) => {
      const b = R.bima;
      const walk = smoother(frac(t, 0, 0.6));
      const wp = lerp3([2, 0, 6], [-7.2, 0, -2.6], walk);
      b.position.set(wp[0], wp[1] + Math.abs(Math.sin(t * Math.PI * 8)) * 0.08 * (1 - walk), wp[2]);
      b.rotation.y = lerp(-0.7, -2.3, walk);
      const swing = Math.sin(t * Math.PI * 8) * (1 - walk);
      R.legL.rotation.x = swing * 0.5; R.legR.rotation.x = -swing * 0.5;
      R.armL.rotation.x = -swing * 0.35; R.armR.rotation.x = swing * 0.35;
      // crouch of concern once he arrives
      const crouch = smoother(frac(t, 0.65, 0.85));
      b.scale.y = 1 - crouch * 0.15; b.position.y -= crouch * 0.1;
      R.bimaHead.rotation.x = crouch * 0.35;
      R.armR.rotation.x = lerp(R.armR.rotation.x, -0.9, crouch); // hand reaches toward the chick
      const k = smoother(t);
      return { pos: lerp3([14, 5.5, 20], [11, 4.5, 16.5], k), look: lerp3([-6, 3.2, -3.5], [-8.5, 2.0, -4.5], k) };
    },
  },
  // 2 — HOOK (S1b): the chick trembles and gazes up at the sky; Bima gazes up too
  {
    a: Math.round((SEG.s1.a + SEG.s1.b) / 2) + 1, b: SEG.s1.b,
    pose: (t, R) => {
      const b = R.bima;
      b.position.set(-7.2, 0, -2.6); b.rotation.y = -2.3;
      b.scale.y = 0.86; b.position.y = -0.08;
      const up = smoother(frac(t, 0.1, 0.45));
      R.bimaHead.rotation.x = lerp(0.35, -0.6, up); // Bima looks up at the nest far above
      R.armL.rotation.z = 0.45; R.armR.rotation.z = -0.45;
      // chick lifts its head to the sky, trembling
      R.chickHead1.rotation.x = lerp(0.5, -0.5, up);
      R.chick1.rotation.z = 0.16 + Math.sin(t * 44) * 0.02;
      const k = smoother(t);
      return { pos: lerp3([-1.5, 2.6, 6.5], [-2.4, 2.9, 5.4], k), look: [-9.2, 1.9, -5.0] };
    },
  },
  // 3 — THE RULE (S2): Bima reassures and points up; the chick shakes its head and cowers
  {
    a: SEG.s2.a, b: SEG.s2.b,
    pose: (t, R) => {
      const b = R.bima;
      b.position.set(-7.2, 0, -2.6); b.rotation.y = -2.3;
      const stand = smoother(frac(t, 0, 0.2));
      b.scale.y = lerp(0.86, 1, stand); b.position.y = lerp(-0.08, 0, stand);
      const point = smoother(frac(t, 0.25, 0.45)) * (1 - smoother(frac(t, 0.8, 0.95)));
      R.armR.rotation.x = -2.7 * point; R.armR.rotation.z = -0.12 - 0.2 * point;
      R.bimaHead.rotation.x = -0.5 * point;
      // the chick cowers at the thought of the leap: head down, body hunched, a small step back
      const cower = smoother(frac(t, 0.45, 0.65)) * (1 - smoother(frac(t, 0.9, 1)));
      R.chickHead1.rotation.x = lerp(-0.5, 0.6, cower);
      R.chick1.rotation.x = lerp(0.1, 0.28, cower);
      R.chick1.position.z = CHICK_GROUND[2] - 0.3 * cower;
      R.chick1.position.x = CHICK_GROUND[0] - 0.2 * cower;
      const k = smoother(t);
      return { pos: lerp3([0.5, 3.2, 8.5], [-0.6, 3.0, 7.4], k), look: [-8.8, 2.1, -4.6] };
    },
  },
  // 4 — DECISION (S3): at the ladder base; the chick hops onto Bima's head; first rungs
  {
    a: SEG.s3.a, b: SEG.s3.b,
    pose: (t, R) => {
      const b = R.bima;
      b.position.set(0, 0, CLIMB_Z + 1.3); b.rotation.y = Math.PI; // face the ladder (-z)
      const crouch = Math.sin(frac(t, 0, 0.3) * Math.PI) * 0.16;
      b.scale.y = 1 - crouch; b.position.y = -crouch * 0.4;
      R.bimaHead.rotation.x = 0.3 * Math.sin(frac(t, 0, 0.3) * Math.PI); // looks down at the chick
      // the chick hops from the ground onto Bima's head
      const hop = smoother(frac(t, 0.22, 0.5));
      const from: V3 = [1.9, 0, CLIMB_Z + 2.3];
      const to: V3 = [0, RIDE_Y * (1 - 0.16 * Math.sin(frac(t, 0.22, 0.5) * Math.PI)), CLIMB_Z + 1.3];
      const cp = lerp3(from, to, hop);
      R.chick1.position.set(cp[0], cp[1] + Math.sin(hop * Math.PI) * 0.9, cp[2]);
      R.chick1.rotation.set(0.05, lerp(-0.6, Math.PI, hop), 0);
      R.chickHead1.rotation.set(0.1, 0, 0);
      const flap = Math.sin(frac(t, 0.22, 0.5) * Math.PI * 4) * 0.4 * Math.sin(hop * Math.PI);
      R.chickWingL1.rotation.z = flap; R.chickWingR1.rotation.z = -flap;
      // then Bima steps in and starts climbing, chick riding
      const go = smoother(frac(t, 0.55, 1));
      b.position.z = lerp(CLIMB_Z + 1.3, CLIMB_Z, go);
      b.position.y += go * go * 3.2;
      if (go > 0.03) {
        climbPose(R, frac(t, 0.55, 1) * Math.PI * 3.2);
        rideChick(R, 0.15, Math.sin(t * 30) * 0.015);
      }
      const k = smoother(t);
      return { pos: lerp3([8.5, 3.0, 9.5], [7.0, 3.6, 8.0], k), look: [0.2, 2.6, -0.6] };
    },
  },
  // 5 — CLIMB 1 (S4): past the giant tree; the chick shuts its eyes (head bowed)
  {
    a: SEG.s4.a, b: SEG.s4.b,
    pose: (t, R) => {
      const b = R.bima;
      const y = lerp(15, 38, smoother(t));
      b.position.set(0, y, CLIMB_Z); b.rotation.y = Math.PI;
      climbPose(R, t * Math.PI * 7);
      rideChick(R, 0.55, Math.sin(t * 40) * 0.02); // eyes shut: head bowed deep
      R.chick1.rotation.x = 0.18; // hunched
      const glance = smoother(frac(t, 0.6, 0.75)) * (1 - smoother(frac(t, 0.9, 1)));
      R.bimaHead.rotation.y = glance * 0.7; R.bimaHead.rotation.x = glance * 0.4; // Bima peeks down at the toy houses
      return { pos: lerp3([-13, y - 3, 11], [-11, y + 2.5, 9], smoother(t)), look: [0, y + 1.9, CLIMB_Z] };
    },
  },
  // 6 — CLIMB 2 (S5): the cloud layer; ladder sways, tired face, the chick trembles hard
  {
    a: SEG.s5.a, b: SEG.s5.b,
    pose: (t, R) => {
      const b = R.bima;
      const y = lerp(58, 80, smoother(t));
      const sway = Math.sin(t * Math.PI * 5.2) * 0.35;
      b.position.set(sway, y, CLIMB_Z); b.rotation.y = Math.PI - 0.2;
      b.rotation.z = Math.sin(t * Math.PI * 5.2) * 0.04;
      R.headNormal.visible = false; R.headTired.visible = true;
      climbPose(R, t * Math.PI * 6);
      rideChick(R, 0.45, Math.sin(t * 47) * 0.05); // hard trembling in the cold wind
      R.chick1.position.x = b.position.x; // rideChick used pre-sway x; realign
      R.chick1.rotation.x = 0.22;
      return { pos: lerp3([-5.8, y + 1.0, 6.2], [-5.2, y + 2.0, 5.4], smoother(t)), look: [0, y + 2.1, CLIMB_Z] };
    },
  },
  // 7 — PIVOT (S6): breaking through the cloud sea; the chick opens its eyes — no longer afraid
  {
    a: SEG.s6.a, b: SEG.s6.b,
    pose: (t, R) => {
      const b = R.bima;
      const y = lerp(80, 90, smoother(clamp01(t / 0.45)));
      b.position.set(0, y, CLIMB_Z);
      const turn = smoother(frac(t, 0.3, 0.55));
      b.rotation.y = Math.PI - turn * Math.PI; // turns outward to face the view
      if (turn < 0.5) climbPose(R, t * Math.PI * 5);
      R.bimaHead.rotation.y = Math.sin(frac(t, 0.55, 1) * Math.PI * 1.2) * 0.4 * turn;
      rideChick(R, 0.45, 0); // start bowed...
      // ...then the chick lifts its head and looks around, delighted
      const rise = smoother(frac(t, 0.15, 0.45));
      R.chickHead1.rotation.x = lerp(0.45, -0.25, rise);
      R.chickHead1.rotation.y = Math.sin(frac(t, 0.45, 1) * Math.PI * 1.4) * 0.5 * rise;
      R.chick1.rotation.set(0.08, b.rotation.y, 0);
      const happy = smoother(frac(t, 0.4, 0.65));
      R.chickWingL1.rotation.z = 0.35 * happy; R.chickWingR1.rotation.z = -0.35 * happy; // wings open a little
      const k = smoother(t);
      return { pos: lerp3([-6.5, y + 2.4, 11.5], [-7.5, y + 3.2, 12.5], k), look: [0, y + 2.1, CLIMB_Z] };
    },
  },
  // 8 — REUNION (S7): mama paces the nest, then wraps the chick in her wings
  {
    a: SEG.s7.a, b: SEG.s7.b,
    pose: (t, R) => {
      const b = R.bima;
      b.position.set(NEST_POS[0] - 6.4, LADDER_TOP - 0.4, NEST_POS[2] + 1.2);
      b.rotation.y = 2.35; // face the nest
      R.bimaHead.rotation.x = -0.2;
      R.armL.rotation.z = 0.5;
      rideChick(R, -0.1, 0); // chick still on Bima's head, looking at mama
      // mama paces, anxious
      const pace = frac(t, 0, 0.45);
      R.mama.position.x = MAMA_HOME[0] + Math.sin(pace * Math.PI * 2) * 1.4;
      R.mama.rotation.y = -0.9 + Math.sin(pace * Math.PI * 2) * 0.35;
      R.mamaHead.rotation.y = Math.sin(pace * Math.PI * 4) * 0.3;
      // she spots them: head snaps toward Bima
      const spot = smoother(frac(t, 0.42, 0.55));
      R.mamaHead.rotation.y = lerp(R.mamaHead.rotation.y, 0.3, spot);
      R.mama.rotation.y = lerp(R.mama.rotation.y, -1.15, spot);
      // the chick flies the last stretch into the nest; mama wraps her wings around it
      const fly = smoother(frac(t, 0.55, 0.78));
      const from: V3 = [b.position.x, b.position.y + RIDE_Y, b.position.z];
      const to: V3 = [NEST_POS[0] - 2.2, NEST_POS[1] - 0.3, NEST_POS[2] + 1.6];
      const fp = lerp3(from, to, fly);
      if (fly > 0) {
        R.chick1.position.set(fp[0], fp[1] + Math.sin(fly * Math.PI) * 1.1, fp[2]);
        R.chick1.rotation.set(0.05, lerp(2.35, -0.9, fly), Math.sin(fly * Math.PI) * 0.15);
        const flap = Math.sin(frac(t, 0.55, 0.78) * Math.PI * 5) * 0.5 * Math.sin(fly * Math.PI);
        R.chickWingL1.rotation.z = flap; R.chickWingR1.rotation.z = -flap;
      }
      const hug = smoother(frac(t, 0.72, 0.9));
      R.mama.position.x = lerp(R.mama.position.x, NEST_POS[0] - 0.6, hug);
      R.mama.position.z = lerp(MAMA_HOME[2], NEST_POS[2] + 0.4, hug);
      R.wingL.rotation.z = 0.15 + 0.55 * hug; R.wingR.rotation.z = -0.15 - 0.55 * hug; // wings wrap forward
      R.mamaHead.rotation.x = 0.28 * hug; // bows over the chick
      R.chickHead1.rotation.x = lerp(-0.1, 0.3, hug); // chick snuggles in
      const k = smoother(t);
      return {
        pos: lerp3([5.2, NEST_POS[1] + 6.2, 20.5], [5.4, NEST_POS[1] + 5.7, 19.2], k),
        look: [5.6, NEST_POS[1] + 2.0, 0],
      };
    },
  },
  // 9 — THE LEAP (S8a): a deep breath at the nest edge... the chick leaps and FLIES a full circle
  {
    a: SEG.s8.a, b: Math.round(SEG.s8.a + (SEG.s8.b - SEG.s8.a) * 0.55),
    pose: (t, R) => {
      const b = R.bima;
      b.position.set(NEST_POS[0] - 6.4, LADDER_TOP - 0.4, NEST_POS[2] + 1.2);
      b.rotation.y = 2.35;
      R.bimaHead.rotation.x = -0.45; // watching up
      const wave = smoother(frac(t, 0.05, 0.2));
      R.armR.rotation.x = -2.8 * wave; R.armR.rotation.z = -0.3 + Math.sin(t * 20) * 0.25 * wave;
      // mama keeps the chick wrapped until the leap moment
      R.chick1.position.set(NEST_POS[0] - 2.2, NEST_POS[1] - 0.3, NEST_POS[2] + 1.6);
      R.chick1.rotation.set(0.05, -0.9, 0);
      R.wingL.rotation.z = 0.55; R.wingR.rotation.z = -0.55;
      R.mama.position.set(NEST_POS[0] - 0.6, MAMA_HOME[1], NEST_POS[2] + 0.4);
      R.mama.rotation.y = -1.15;
      // anticipation: crouch, wings spread
      const anti = smoother(frac(t, 0.1, 0.3));
      R.chick1.scale.y = 0.52 * (1 - 0.18 * Math.sin(frac(t, 0.1, 0.3) * Math.PI));
      R.chickWingL1.rotation.z = 0.5 * anti; R.chickWingR1.rotation.z = -0.5 * anti;
      // THE LEAP: one full circle above the nest, wings flapping hard
      const flyT = frac(t, 0.32, 0.97);
      if (flyT > 0) {
        const th = -Math.PI / 2 + flyT * Math.PI * 2;
        const C: V3 = [5.6, NEST_POS[1] + 5.2, 2.5];
        R.chick1.position.set(
          C[0] + Math.cos(th) * 3.4,
          C[1] + Math.sin(flyT * Math.PI * 4) * 0.4,
          C[2] + Math.sin(th) * 3.4,
        );
        R.chick1.rotation.set(0, -th, 0.3);
        const flap = 0.3 + Math.sin(flyT * Math.PI * 10) * 0.55;
        R.chickWingL1.rotation.z = flap; R.chickWingR1.rotation.z = -flap;
        R.chickHead1.rotation.x = -0.15;
        R.mamaHead.rotation.y = Math.sin(th) * 0.4; // mama tracks the flight
      }
      const k = smoother(t);
      return {
        pos: lerp3([5.4, NEST_POS[1] + 6.4, 21], [5.8, NEST_POS[1] + 6.0, 19.8], k),
        look: [5.6, NEST_POS[1] + 3.2, 0.8],
      };
    },
  },
  // 10 — PAYOFF (S8b): the chick lands back on Bima's head; he laughs; wide pull-back
  {
    a: Math.round(SEG.s8.a + (SEG.s8.b - SEG.s8.a) * 0.55) + 1, b: SEG.s8.b,
    pose: (t, R) => {
      const b = R.bima;
      b.position.set(NEST_POS[0] - 6.4, LADDER_TOP - 0.4, NEST_POS[2] + 1.2);
      b.rotation.y = 2.35;
      // mama watches proudly from the nest
      R.mama.position.set(NEST_POS[0] - 0.6, MAMA_HOME[1], NEST_POS[2] + 0.4);
      R.mama.rotation.y = -1.15;
      R.mamaHead.rotation.x = -0.1;
      // the chick glides down from its circle and lands on Bima's head
      const land = smoother(frac(t, 0, 0.45));
      const from: V3 = [5.6, NEST_POS[1] + 5.2, -0.9];
      const to: V3 = [b.position.x, b.position.y + RIDE_Y, b.position.z];
      const lp = lerp3(from, to, land);
      R.chick1.position.set(lp[0], lp[1] + Math.sin(land * Math.PI) * 0.7, lp[2]);
      R.chick1.rotation.set(0.06, lerp(-1.2, 2.35, land), lerp(0.3, 0, land));
      const flapAmp = (1 - land) * 0.5 + 0.05;
      const flap = Math.sin(frac(t, 0, 0.45) * Math.PI * 6) * flapAmp;
      R.chickWingL1.rotation.z = flap + 0.08; R.chickWingR1.rotation.z = -flap - 0.08;
      // touchdown bounce
      const sq = Math.sin(frac(t, 0.44, 0.58) * Math.PI);
      R.chick1.scale.y = 0.52 * (1 - 0.15 * sq);
      b.scale.y = 1 - 0.06 * sq;
      // Bima laughs up at his new passenger and waves
      R.bimaHead.rotation.x = -0.5;
      const wv = smoother(frac(t, 0.5, 0.6));
      R.armR.rotation.x = -2.9 * wv; R.armR.rotation.z = -0.3 + Math.sin(frac(t, 0.55, 1) * 20) * 0.3 * wv;
      R.armL.rotation.z = 0.35;
      R.chickHead1.rotation.x = -0.2; // chick looks down at Bima, pleased
      const pull = smoother(frac(t, 0.35, 1));
      return {
        pos: lerp3([5.4, NEST_POS[1] + 6.0, 19.8], [16, NEST_POS[1] + 10, 30], pull),
        look: lerp3([5.6, NEST_POS[1] + 2.2, 0], [4, NEST_POS[1] + 1, -1], pull),
      };
    },
  },
];

export function poseFrame(frame: number, R: WorldRefs, camera: THREE.Camera) {
  resetAll(R);
  // PERBAIKAN LOKAL (24 Nov 2026): frame celah antar segmen (jeda narasi 0,15 dtk
  // = 4 frame di timing.ts) tidak masuk rentang shot mana pun. Logika patokan
  // ("shot terakhir bila tak ada yang cocok") membuat frame celah melompat ke
  // pose awal shot terakhir — kilasan adegan penutup 3 frame di setiap batas
  // segmen. Di sini frame celah menahan shot sebelumnya (t terklamp ke 1).
  let shot = SHOTS[0];
  for (const s of SHOTS) {
    if (frame >= s.a) shot = s;
    if (frame >= s.a && frame <= s.b) break;
  }
  const t = frac(frame, shot.a, shot.b);
  const { pos, look } = shot.pose(t, R);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  // gentle idle life so no shot is ever frozen: mama breathes, chicks sway
  R.mama.position.y += Math.sin(frame * 0.05) * 0.05;
  R.chick2.rotation.z = Math.cos(frame * 0.13) * 0.03;
  R.chickHead2.rotation.x = -0.2 * Math.abs(Math.sin(frame * 0.07));
  void CLOUD_SEA_Y;
}
