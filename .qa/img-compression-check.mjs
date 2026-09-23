// Flags images that may be over-compressed: unusually few bytes per pixel for
// their visual complexity. Photographs with detail need more bytes than flat
// artwork, so complexity is estimated from edge energy on a downscaled copy.
// Usage (from .qa/): node img-compression-check.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.webp$/i.test(f)) files.push(f.replace(/\\/g, "/"));
  }
})("../public/images");

const rows = [];
for (const f of files) {
  const m = await sharp(f).metadata();
  const px = (m.width ?? 0) * (m.height ?? 0);
  if (!px) continue;
  const bytes = fs.statSync(f).size;
  // edge energy: mean absolute Laplacian on a 128px grey copy
  const g = await sharp(f).resize(128, 128, { fit: "fill" }).grayscale().raw().toBuffer();
  let e = 0;
  for (let y = 1; y < 127; y++) for (let x = 1; x < 127; x++) {
    const i = y * 128 + x;
    e += Math.abs(4 * g[i] - g[i - 1] - g[i + 1] - g[i - 128] - g[i + 128]);
  }
  const detail = e / (126 * 126);
  rows.push({ f: f.replace("../public", ""), w: m.width, h: m.height, kb: +(bytes / 1024).toFixed(1), bpp: +(bytes / px).toFixed(3), detail: +detail.toFixed(1) });
}
fs.writeFileSync("screenshots/img-compression.json", JSON.stringify(rows, null, 1));

// detailed pictures (detail > 12) carrying very few bytes per pixel are the suspects
const suspects = rows.filter((r) => r.detail > 12 && r.bpp < 0.06).sort((a, b) => a.bpp - b.bpp);
console.log(`images checked: ${rows.length}`);
console.log(`detailed but very lightly encoded (detail>12, bpp<0.06): ${suspects.length}`);
for (const r of suspects.slice(0, 30)) console.log(`  bpp ${r.bpp}  detail ${r.detail}  ${r.w}x${r.h} ${r.kb}kB  ${r.f}`);
