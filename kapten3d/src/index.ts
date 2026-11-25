import React from "react";
import { Composition, registerRoot } from "remotion";
// Kapten Blok 3D — komposisi tunggal untuk seri Kapten 3D.
import { KaptenShort, KAPTEN_FRAMES } from "./videos/kapten/Kapten";

const Root: React.FC = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, {
    id: "KaptenBlok",
    component: KaptenShort,
    durationInFrames: KAPTEN_FRAMES,
    fps: 30,
    width: 1080,
    height: 1920,
  }),
);
registerRoot(Root);
