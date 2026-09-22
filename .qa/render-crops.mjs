// Printed illustrations drawn as vector artwork have no embedded raster, so
// extract-images.mjs cannot find them. This renders their PDF page at 4× and
// crops the artwork alone (no printed text) into extract/img/<edition>/ as
// p<page>-r<n>.jpg, where build-articles.mjs / write-stories.mjs pick it up
// like any other extracted image (e.g. `hero: "p38-r1"` in a story spec).
// Crop boxes are fractions of the page: [left, top, right, bottom].
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node render-crops.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const CROPS = [
  // Guru Purnima — raised hand, open book, lotuses and kalash (Info Corner)
  { edition: "july-2026", page: 38, n: 1, box: [0.08, 0.05, 0.95, 0.49], suffix: "b" },
  // World UFO Day — alien waving from a flying saucer (Facts and Figures)
  { edition: "july-2026", page: 70, n: 1, box: [0.03, 0.15, 0.583, 0.46], suffix: "b" },
  // World Water Day — line-art water drop (Open House, "Liquid Lifeline")
  { edition: "march-2024", page: 35, n: 1, box: [0.22, 0.1, 0.78, 0.59], suffix: "b" },
  // International Women's Day — a woman among flowers (Info Corner)
  { edition: "march-2026", page: 44, n: 1, box: [0.385, 0.315, 0.745, 0.56], suffix: "b" },
  // World Tourism Day — traveller with a map, hot-air balloons (Info Corner)
  { edition: "september-2026", page: 33, n: 1, box: [0, 0.02, 0.515, 0.45], suffix: "b" },
];

for (const { edition, page, n, box, suffix } of CROPS) {
  const render = `extract/renders/${edition}-p${page}.png`;
  execFileSync(process.execPath, ["render-pages.mjs", edition, String(page)], {
    env: { ...process.env, RENDER_SCALE: "4" },
    stdio: "ignore",
  });
  const { width: W, height: H } = await sharp(render).metadata();
  const [l, t, r, b] = box;
  const rect = { left: Math.round(l * W), top: Math.round(t * H), width: Math.round((r - l) * W), height: Math.round((b - t) * H) };
  const out = `extract/img/${edition}/p${page}-r${n}${suffix ?? ""}.jpg`;
  await sharp(render).extract(rect).flatten({ background: "#ffffff" }).jpeg({ quality: 92, mozjpeg: true }).toFile(out);
  await fs.rm(render);
  console.log(out, `${rect.width}x${rect.height}`);
}
