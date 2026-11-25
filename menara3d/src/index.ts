import React from "react";
import { Composition, registerRoot } from "remotion";
// ADAPTASI LOKAL (salinan kerja Messi): komposisi BridgeShort dibuang karena
// folder src/videos/bridge/ TIDAK disertakan dalam paket. BimaTangga (potret,
// Shorts) + BimaMenara (lanskap 1920x1080, video panjang).
import { BimaTangga, BIMA_FRAMES } from "./videos/bima/Bima";
import { BimaMenara, MENARA_FRAMES } from "./videos/menara/Menara";

const Root: React.FC = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, {
    id: "BimaTangga",
    component: BimaTangga,
    durationInFrames: BIMA_FRAMES,
    fps: 30,
    width: 1080,
    height: 1920,
  }),
  React.createElement(Composition, {
    id: "BimaMenara",
    component: BimaMenara,
    durationInFrames: MENARA_FRAMES,
    fps: 30,
    width: 1920,
    height: 1080,
  }),
);
registerRoot(Root);
