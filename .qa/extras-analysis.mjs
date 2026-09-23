// Analyses the PDF "extras" data so the presentation can be designed from
// facts: which images are real pictures vs flat colour swatches pulled out of
// a page background, and how much of the printed text arrives letter-spaced.
// Usage (from .qa/): node extras-analysis.mjs
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const src = fs.readFileSync("../src/data/extras.ts", "utf8");
const json = src.slice(src.indexOf("= {") + 2, src.lastIndexOf("};") + 1);
const extras = JSON.parse(json);

const blocks = Object.values(extras).flat();
const imgs = [...new Set(blocks.flatMap((b) => b.images.map((i) => i.src)))];

// Flatness: standard deviation of a 32x32 greyscale thumbnail. Flat colour
// fields (page backgrounds cut out as images) have almost no variation.
let flat = 0, tiny = 0, real = 0;
const flatList = [];
for (const s of imgs) {
  const f = "../public" + s;
  if (!fs.existsSync(f)) continue;
  const { width, height } = await sharp(f).metadata();
  const stats = await sharp(f).greyscale().resize(32, 32, { fit: "fill" }).stats();
  const sd = stats.channels[0].stdev;
  if (sd < 6) { flat++; flatList.push([s, Math.round(sd), `${width}x${height}`]); }
  else if (width < 60 || height < 60) tiny++;
  else real++;
}

const spacedRe = /(?:\b\w\s){3,}\w\b/; // "T H E", "G L O B A L"
let spaced = 0, paras = 0;
const byKind = {};
for (const b of blocks) {
  byKind[b.kind] ??= { blocks: 0, paras: 0, images: 0, withText: 0, withImages: 0 };
  byKind[b.kind].blocks++;
  byKind[b.kind].paras += b.paragraphs.length;
  byKind[b.kind].images += b.images.length;
  if (b.paragraphs.length) byKind[b.kind].withText++;
  if (b.images.length) byKind[b.kind].withImages++;
  for (const p of b.paragraphs) { paras++; if (spacedRe.test(p)) spaced++; }
}

console.log(`blocks ${blocks.length}, unique images ${imgs.length}, paragraphs ${paras}`);
console.log(`images: real ${real}, flat colour ${flat}, tiny ${tiny}`);
console.log(`letter-spaced paragraphs: ${spaced} (${Math.round((spaced / paras) * 100)}%)`);
console.log("by kind:", JSON.stringify(byKind, null, 1));
console.log("sample flat images:", flatList.slice(0, 8).map((x) => x.join(" ")).join("\n  "));
fs.writeFileSync("tmp/extras-flat.json", JSON.stringify(flatList.map((x) => x[0]), null, 1));
