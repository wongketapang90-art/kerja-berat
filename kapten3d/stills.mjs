// Adapted from templates/scripts/bridge-stills.mjs for this Linux VM:
// - browserExecutable: local Chrome Headless Shell (no proxy wrapper; bundle is local)
// - chromiumOptions.gl: "swangle" (SwiftShader) instead of Windows "angle"
// - TEMP/TMP must point at REMOTION_TMP dir (set by caller env) so bundles stay on the big disk.
// usage: node stills.mjs <outPrefix> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundle_s", ((Date.now() - t0) / 1000).toFixed(1));
const composition = await selectComposition({ serveUrl, id: "KaptenBlok", browserExecutable, chromiumOptions });
console.log("comp", composition.id, composition.durationInFrames, "frames @", composition.fps, "fps", composition.width + "x" + composition.height);
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const ts = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog });
  console.log("still", f, ((Date.now() - ts) / 1000).toFixed(1) + "s");
}
