// Contact sheet per story: the hero as shipped (left, red frame) beside the
// largest images embedded on its printed page, so it can be judged by eye
// whether a higher-resolution copy of the SAME photograph exists.
// Usage (from .qa/): node hero-candidates.mjs <slug> [slug ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const CELL = 260;
const PAD = 8;
const rows = JSON.parse(fs.readFileSync("screenshots/hero-source-check.json", "utf8"));
const OUT = "screenshots/hero-candidates";
fs.mkdirSync(OUT, { recursive: true });

const label = (text, w) =>
  Buffer.from(`<svg width="${w}" height="22"><rect width="${w}" height="22" fill="#111"/><text x="4" y="16" font-family="monospace" font-size="12" fill="#fff">${text.replace(/&/g, "&amp;").slice(0, 46)}</text></svg>`);

for (const slug of process.argv.slice(2)) {
  const r = rows.find((x) => x.slug === slug);
  if (!r) { console.log("no record:", slug); continue; }
  const idx = JSON.parse(fs.readFileSync(`extract/img/${r.edition}/index.json`, "utf8"));
  const cands = idx
    .filter((i) => r.pages.includes(i.page))
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 5);

  const cells = [{ file: `../public${r.hero}`, text: `SHIPPED ${r.w}x${r.h}` }, ...cands.map((c) => ({ file: c.file, text: `${path.basename(c.file)} ${c.width}x${c.height}` }))];
  const tiles = [];
  for (const [n, c] of cells.entries()) {
    const img = await sharp(c.file).resize({ width: CELL, height: CELL, fit: "contain", background: "#222" }).toBuffer();
    const left = n * (CELL + PAD);
    tiles.push({ input: img, left, top: 22 });
    tiles.push({ input: label(c.text, CELL), left, top: 0 });
  }
  await sharp({ create: { width: cells.length * (CELL + PAD), height: CELL + 22, channels: 3, background: "#222" } })
    .composite(tiles).png().toFile(`${OUT}/${slug}.png`);
  console.log("sheet:", slug, `(${cands.length} candidates on p${r.pages})`);
}
