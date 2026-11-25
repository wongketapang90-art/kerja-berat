// Short clip throughput test: renderMedia on a frame range, timed.
// usage: node clip.mjs <start> <end> <scale> <out.mp4>
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [start, end, scale, out] = process.argv.slice(2);
const browserExecutable = "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundle_s", ((Date.now() - t0) / 1000).toFixed(1));
const composition = await selectComposition({ serveUrl, id: "BimaTangga", browserExecutable, chromiumOptions });
const t1 = Date.now();
let last = 0;
await renderMedia({
  composition, serveUrl, codec: "h264", outputLocation: out,
  frameRange: [Number(start), Number(end)], scale: Number(scale),
  browserExecutable, chromiumOptions, concurrency: 1, crf: 23,
  timeoutInMilliseconds: 300000,
  onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p >= last + 25) { last = p; console.log("progress", p + "%", ((Date.now() - t1) / 1000).toFixed(0) + "s"); } },
});
const dt = (Date.now() - t1) / 1000;
const n = Number(end) - Number(start) + 1;
console.log(`renderMedia ${n} frames in ${dt.toFixed(1)}s = ${(dt / n).toFixed(2)}s/frame`);
