// Fills stories that had no image with the artwork printed on their own PDF
// pages. Vector illustrations (and a few photographs held behind clipping
// masks) are not reachable by extract-images.mjs, so they are cropped from a
// 4x render of the page (render-hires.mjs → extract/renders-hires/).
// Every crop is traceable: edition, PDF page and the crop box as fractions of
// the rendered page (x0, y0, x1, y1). Output: extract/img/<edition>/p<page>-r<n>.jpg
// and missing-images.json (the manifest the specs are written from).
// Usage (from .qa/): node crop-missing-images.mjs [--only=<edition>/<ref>,...]
// With --only, just those files are rewritten and the manifest is left alone.
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const PRED = [0.04, 0.19, 0.96, 0.272]; // Predictions 2026: the printed row Aries–Virgo
const ASTRO = [0.06, 0.205, 0.94, 0.29]; // Astro Time 2024: the printed row of zodiac signs
// Top 5 photographs are raster images embedded at low resolution: the 4x render only
// inflates them. SOURCE_SCALE brings each crop back to its true embedded pixel size,
// measured on the one extracted copy: september-2026 p26-2 is the Tawang Festival photograph,
// 225px wide where its 4x crop (p26-r5) is 605px → 0.372.
const SOURCE_SCALE = 0.372;
const shrink = ([a, b, c, d], k = 0.008) => [a + k, b + k, c - k, d - k]; // clear rounded photo corners

// slug → [{ edition, page, box, role, from? }] (from: crop an extracted image instead of the render)
const CROPS = {
  "predictions-june-2026": [{ edition: "june-2026", page: 84, box: PRED, role: "hero" }],
  "predictions-may-2026": [{ edition: "may-2026", page: 84, box: PRED, role: "hero" }],
  "predictions-march-2026": [{ edition: "march-2026", page: 82, box: PRED, role: "hero" }],
  "predictions-september-2026": [{ edition: "september-2026", page: 80, box: PRED, role: "hero" }],
  "predictions-august-2026": [{ edition: "august-2026", page: 80, box: PRED, role: "hero" }],
  "predictions-july-2026": [{ edition: "july-2026", page: 80, box: PRED, role: "hero" }],
  // printed as the left page of a spread (an advertisement faces it)
  "predictions-april-2026": [{ edition: "april-2026", page: 40, box: [0.02, 0.19, 0.48, 0.272], role: "hero" }],
  "your-forecast-this-month-may-2024": [{ edition: "may-2024", page: 66, box: ASTRO, role: "hero" }],
  "your-forecast-this-month-april-2024": [{ edition: "april-2024", page: 70, box: ASTRO, role: "hero" }],
  "your-forecast-this-month-march-2024": [{ edition: "march-2024", page: 70, box: ASTRO, role: "hero" }],
  "your-forecast-this-month-february-2024": [{ edition: "february-2024", page: 72, box: ASTRO, role: "hero" }],
  "international-womens-day-info-corner": [{ edition: "march-2026", page: 44, box: [0.35, 0.26, 0.66, 0.52], role: "hero" }],
  "world-water-day-liquid-lifeline": [{ edition: "march-2024", page: 35, box: [0.31, 0.115, 0.72, 0.575], role: "hero" }],
  // the opener artwork is an extracted image (p35-1); cropped to the cross and stethoscope
  "world-red-cross-day-courage-across-borders": [{ edition: "may-2024", page: 35, box: [0.12, 0.1, 0.78, 0.6], role: "hero", from: "p35-1" }],
  "world-tourism-day-info-corner": [{ edition: "september-2026", page: 33, box: [0.08, 0.045, 0.88, 0.49], role: "hero" }],
  "guru-purnima-info-corner": [{ edition: "july-2026", page: 38, box: [0.07, 0.04, 0.92, 0.515], role: "hero" }],
  "world-ufo-day-facts-and-figures": [
    { edition: "july-2026", page: 70, box: [0.1, 0.16, 0.58, 0.47], role: "hero" },
    { edition: "july-2026", page: 70, box: [0.17, 0.64, 0.46, 0.84], role: "gallery" },
    { edition: "july-2026", page: 70, box: [0.51, 0.82, 0.93, 0.965], role: "gallery" },
    { edition: "july-2026", page: 71, box: [0.5, 0.07, 0.92, 0.41], role: "gallery" },
    { edition: "july-2026", page: 71, box: [0.04, 0.32, 0.46, 0.72], role: "gallery" },
  ],
  "top-5-events-in-july-2026": [
    { edition: "july-2026", page: 22, box: shrink([0.115, 0.185, 0.35, 0.3]), role: "hero", scale: SOURCE_SCALE },
    { edition: "july-2026", page: 22, box: shrink([0.63, 0.33, 0.875, 0.46]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "july-2026", page: 22, box: shrink([0.115, 0.495, 0.355, 0.625]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "july-2026", page: 22, box: shrink([0.595, 0.65, 0.875, 0.77]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "july-2026", page: 22, box: shrink([0.115, 0.8, 0.385, 0.935]), role: "gallery", scale: SOURCE_SCALE },
  ],
  "top-5-events-in-august-2026": [
    { edition: "august-2026", page: 22, box: shrink([0.115, 0.19, 0.355, 0.305]), role: "hero", scale: SOURCE_SCALE },
    { edition: "august-2026", page: 22, box: shrink([0.63, 0.33, 0.875, 0.46]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "august-2026", page: 22, box: shrink([0.115, 0.49, 0.385, 0.61]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "august-2026", page: 22, box: shrink([0.595, 0.645, 0.875, 0.775]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "august-2026", page: 22, box: shrink([0.115, 0.815, 0.385, 0.94]), role: "gallery", scale: SOURCE_SCALE },
  ],
  "top-5-events-in-october-2026": [
    { edition: "september-2026", page: 26, box: shrink([0.115, 0.19, 0.355, 0.295]), role: "hero", scale: SOURCE_SCALE },
    { edition: "september-2026", page: 26, box: shrink([0.63, 0.335, 0.87, 0.46]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "september-2026", page: 26, box: shrink([0.115, 0.49, 0.385, 0.595]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "september-2026", page: 26, box: shrink([0.6, 0.63, 0.875, 0.755]), role: "gallery", scale: SOURCE_SCALE },
    { edition: "september-2026", page: 26, box: shrink([0.115, 0.795, 0.385, 0.94]), role: "gallery", scale: SOURCE_SCALE },
  ],
};

const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const manifest = [];
if (!process.argv.some((a) => a.startsWith("--only="))) await fs.rm("tmp/crops", { recursive: true, force: true });
await fs.mkdir("tmp/crops", { recursive: true });
for (const [slug, crops] of Object.entries(CROPS)) {
  const perPage = {};
  for (const c of crops) {
    const src = c.from ? `extract/img/${c.edition}/${c.from}.jpg` : `extract/renders-hires/${c.edition}-p${c.page}.png`;
    const meta = await sharp(src).metadata();
    const [x0, y0, x1, y1] = c.box.map((v) => Math.max(0, Math.min(1, v)));
    const region = {
      left: Math.round(x0 * meta.width),
      top: Math.round(y0 * meta.height),
      width: Math.round((x1 - x0) * meta.width),
      height: Math.round((y1 - y0) * meta.height),
    };
    perPage[c.page] = (perPage[c.page] ?? 0) + 1;
    const ref = `p${c.page}-r${perPage[c.page]}`;
    const out = `extract/img/${c.edition}/${ref}.jpg`;
    if (ONLY && !ONLY.includes(`${c.edition}/${ref}`)) continue;
    let img = sharp(src).extract(region).flatten({ background: "#ffffff" });
    if (c.scale) img = sharp(await img.resize({ width: Math.round(region.width * c.scale) }).png().toBuffer());
    const outMeta = await img.metadata();
    await img.clone().jpeg({ quality: 92, mozjpeg: true }).toFile(out);
    await img.clone().resize({ width: 420, height: 320, fit: "inside" }).png().toFile(`tmp/crops/${slug}--${ref}.png`);
    manifest.push({ slug, role: c.role, edition: c.edition, pdfPage: c.page, ref, source: c.from ? `extracted image ${c.from}` : "4x page render", box: c.box.map((v) => +v.toFixed(3)), width: outMeta.width, height: outMeta.height, ...(c.scale ? { scaledToSource: c.scale } : {}) });
  }
}
if (!ONLY) await fs.writeFile("missing-images.json", JSON.stringify(manifest, null, 1));
console.log(`${manifest.length} crops for ${Object.keys(CROPS).length} stories`);
