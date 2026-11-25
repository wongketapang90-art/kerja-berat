import React from "react";
import { Composition, registerRoot } from "remotion";
// ADAPTASI LOKAL (salinan kerja Messi): komposisi BridgeShort dibuang karena
// folder src/videos/bridge/ TIDAK disertakan dalam paket. Hanya BimaTangga.
import { BimaTangga, BIMA_FRAMES } from "./videos/bima/Bima";

const Root: React.FC = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, {
    id: "BimaTangga",
    component: BimaTangga,
    durationInFrames: BIMA_FRAMES,
    fps: 30,
    width: 1080,
    height: 1920,
  }),
);
registerRoot(Root);
