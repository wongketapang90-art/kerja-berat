// Final render on the kerja-berat runner: node render_final.mjs <out.mp4>
// Env: COMP_ID (composition id, default "KaptenMenara"),
//      FRAME_RANGE ("awal-akhir", opsional — kosong = render penuh),
//      CHROME_BIN (optional path to chrome headless shell), CONCURRENCY (default 3)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import path from "node:path";

const out = process.argv[2] || "out/video.mp4";
const compId = process.env.COMP_ID || "KaptenMenara";
let frameRange;
if (process.env.FRAME_RANGE) {
  const parts = process.env.FRAME_RANGE.split("-").map((v) => Number(v));
  if (parts.length === 2 && parts.every((v) => Number.isInteger(v) && v >= 0) && parts[1] >= parts[0]) {
    frameRange = [parts[0], parts[1]];
  } else {
    console.error("FRAME_RANGE tidak valid:", process.env.FRAME_RANGE);
    process.exit(1);
  }
}
const t0 = Date.now();
let browserExecutable = process.env.CHROME_BIN || undefined;
if (!browserExecutable) {
  await ensureBrowser();
  console.log("browser ensured (remotion default)");
}
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
console.log("bundle_s", ((Date.now() - t0) / 1000).toFixed(1));
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable, chromiumOptions: { gl: "swangle" } });
console.log("comp", composition.id, composition.durationInFrames, "frames", frameRange ? `range ${frameRange[0]}-${frameRange[1]}` : "penuh");
const t1 = Date.now();
let last = 0;
await renderMedia({
  composition, serveUrl, codec: "h264", outputLocation: out,
  scale: 1, browserExecutable, chromiumOptions: { gl: "swangle" },
  concurrency: Number(process.env.CONCURRENCY || 3), crf: 18,
  timeoutInMilliseconds: 600000,
  ...(frameRange ? { frameRange } : {}),
  onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p >= last + 5) { last = p; console.log("progress", p + "%", ((Date.now() - t1) / 1000).toFixed(0) + "s"); } },
});
const dt = (Date.now() - t1) / 1000;
const rendered = frameRange ? frameRange[1] - frameRange[0] + 1 : composition.durationInFrames;
console.log(`renderMedia ${rendered} frames in ${dt.toFixed(1)}s = ${(dt / rendered).toFixed(2)}s/frame`);
