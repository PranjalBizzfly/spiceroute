// Tells a genuine stitched picture (a photograph printed as tiles) from a
// "composite" that is really a collage: separate photographs scattered on the
// printed page, with white paper showing between them.
//
// A real picture fills its own frame. A collage leaves large empty regions, so
// we measure the share of near-white pixels and — more telling — the share of
// INTERIOR rows and columns that are almost entirely white, which is what a gap
// between photographs looks like.
// Usage (from .qa/): node composite-check.mjs [--all]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const N = 96; // analysis grid
const WHITE = 242;

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/-page\.webp$/.test(e.name)) files.push(f.replace(/\\/g, "/"));
  }
})("../public/images/extras");

// A picture is only really shown when extras.ts references it AND the junk list
// in extrasImages.ts does not filter it out at render. Checking references alone
// over-reports: several composites are referenced but never drawn.
const used = fs.existsSync("../src/data/extras.ts") ? fs.readFileSync("../src/data/extras.ts", "utf8") : "";
const imagesTs = fs.existsSync("../src/data/extrasImages.ts") ? fs.readFileSync("../src/data/extrasImages.ts", "utf8") : "";
const junk = new Set(
  imagesTs
    .split("\n")
    .map((l) => l.match(/^\s*"(\/images\/extras\/[^"]+)",\s*$/)?.[1])
    .filter(Boolean),
);
const rows = [];
for (const f of files) {
  const url = f.replace("../public", "");
  const { data } = await sharp(f).flatten({ background: "#ffffff" }).resize(N, N, { fit: "fill" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  let white = 0;
  for (const v of data) if (v >= WHITE) white++;

  // interior bands that are essentially all white: the paper between photographs
  const band = (get) => {
    let n = 0;
    for (let i = 4; i < N - 4; i++) {
      let w = 0;
      for (let j = 0; j < N; j++) if (get(i, j) >= WHITE) w++;
      if (w / N > 0.92) n++;
    }
    return n / (N - 8);
  };
  const rowsWhite = band((i, j) => data[i * N + j]);
  const colsWhite = band((i, j) => data[j * N + i]);

  rows.push({
    f: url,
    whitePct: Math.round((white / data.length) * 100),
    gapRowsPct: Math.round(rowsWhite * 100),
    gapColsPct: Math.round(colsWhite * 100),
    used: used.includes(url) && !junk.has(url),
  });
}

rows.sort((a, b) => b.gapRowsPct + b.gapColsPct - (a.gapRowsPct + a.gapColsPct));
fs.writeFileSync("screenshots/composite-check.json", JSON.stringify(rows, null, 1));

const suspect = rows.filter((r) => (r.gapRowsPct >= 8 || r.gapColsPct >= 8) && r.whitePct >= 20);
console.log(`"-page" composites on disk: ${rows.length} (referenced by extras.ts: ${rows.filter((r) => r.used).length})`);
console.log(`look like collages rather than one picture: ${suspect.length} (${suspect.filter((r) => r.used).length} of them in use)\n`);
for (const r of (process.argv.includes("--all") ? rows : suspect).slice(0, 40))
  console.log(`white ${String(r.whitePct).padStart(3)}%  gap-rows ${String(r.gapRowsPct).padStart(3)}%  gap-cols ${String(r.gapColsPct).padStart(3)}%  ${r.used ? "IN USE " : "unused "} ${r.f}`);
