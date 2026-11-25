import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildWorld, WorldRefs } from "./world";
import { poseFrame } from "./story";
import { CAPTIONS, TOTAL_FRAMES } from "./timing";

// Komposisi LANSKAP 1920x1080 untuk video panjang Kapten Blok 3D.
// Rig sama pola-nya dengan komposisi potret KaptenBlok (dan BimaMenara):
// fov 40, kamera bayangan matahari diperlebar (+-60) agar kota yang
// diperluas tetap berbayang, caption di bawah (margin samping 160,
// fontSize 54).
const Rig: React.FC<{ refs: WorldRefs }> = ({ refs }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useMemo(() => {
    scene.fog = new THREE.Fog(new THREE.Color("#d7e7f5"), 90, 420);
    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x8a7a5a, 1.0);
    scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(amb);
    const fill = new THREE.DirectionalLight(0xd8ecff, 0.35); fill.position.set(50, 30, 90); scene.add(fill);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
    sun.position.set(-45, 80, 35);
    sun.target.position.set(0, 0, -5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -40; sc.near = 10; sc.far = 420;
    sun.shadow.bias = -0.0006;
    scene.add(sun); scene.add(sun.target);
  }, [scene]);
  poseFrame(frame, refs, camera as THREE.PerspectiveCamera);
  (camera as THREE.PerspectiveCamera).fov = 40;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return null;
};

const World: React.FC = () => {
  const { width, height } = useVideoConfig();
  const { group, refs } = useMemo(() => {
    const group = new THREE.Group();
    const refs = buildWorld(group as unknown as THREE.Scene);
    return { group, refs };
  }, []);
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.1, far: 2000, position: [0, 6, 30] }}>
      <primitive object={group} />
      <Rig refs={refs} />
    </ThreeCanvas>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const cur = CAPTIONS.find((c) => frame >= c.a && frame <= c.b);
  if (!cur) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 160, right: 160, bottom: 54,
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 900, fontSize: 54,
          lineHeight: 1.18, color: "#ffffff", textAlign: "center",
          WebkitTextStroke: "10px rgba(20,16,24,0.92)", paintOrder: "stroke fill",
          textShadow: "0 4px 0 rgba(20,16,24,0.55)",
        }}>{cur.text}</div>
      </div>
    </AbsoluteFill>
  );
};

export const KaptenMenara: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#8fbbe8" }}>
    <World />
    <Captions />
  </AbsoluteFill>
);

export const KAPTEN_MENARA_FRAMES = TOTAL_FRAMES;
