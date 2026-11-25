import React from "react";
import { Composition, registerRoot } from "remotion";
// Kapten Blok 3D — KaptenBlok (potret 1080x1920, Shorts) + KaptenMenara
// (lanskap 1920x1080, video panjang) dalam satu proyek.
import { KaptenShort, KAPTEN_FRAMES } from "./videos/kapten/Kapten";
import { KaptenMenara, KAPTEN_MENARA_FRAMES } from "./videos/kaptenmenara/KaptenMenara";

const Root: React.FC = () => React.createElement(React.Fragment, null,
  React.createElement(Composition, {
    id: "KaptenBlok",
    component: KaptenShort,
    durationInFrames: KAPTEN_FRAMES,
    fps: 30,
    width: 1080,
    height: 1920,
  }),
  React.createElement(Composition, {
    id: "KaptenMenara",
    component: KaptenMenara,
    durationInFrames: KAPTEN_MENARA_FRAMES,
    fps: 30,
    width: 1920,
    height: 1080,
  }),
);
registerRoot(Root);
