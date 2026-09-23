// Finds pictures in the extras data that are almost entirely blank: page
// fragments (a rule, a bar, a corner mark) cut out with their white
// surroundings. They read as stray marks in a plate row.
// Measure: share of pixels that differ from the image's own corner colour.
// Usage (from .qa/): node extras-blank-images.mjs
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const src = fs.readFileSync("../src/data/extras.ts", "utf8");
const extras = JSON.parse(src.slice(src.indexOf("= {") + 2, src.lastIndexOf("};") + 1));
const imgs = new Map();
for (const b of Object.values(extras).flat()) for (const i of b.images) imgs.set(i.src, i);

const blank = [];
for (const [s, meta] of imgs) {
  const f = "../public" + s;
  if (!fs.existsSync(f)) continue;
  const W = 64;
  const { data, info } = await sharp(f).flatten({ background: "#ffffff" }).greyscale().resize(W, W, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const bg = data[0]; // top-left: the fragment's own background
  let ink = 0;
  for (let i = 0; i < data.length; i++) if (Math.abs(data[i] - bg) > 24) ink++;
  const share = ink / (info.width * info.height);
  if (share < 0.03) blank.push({ src: s, ink: +(share * 100).toFixed(1), size: `${meta.width}x${meta.height}` });
}

blank.sort((a, b) => a.ink - b.ink);
console.log(`pictures ${imgs.size}, almost blank ${blank.length}`);
for (const b of blank.slice(0, 15)) console.log(`  ${b.src} ${b.size} ink ${b.ink}%`);
fs.writeFileSync("tmp/extras-blank.json", JSON.stringify(blank.map((b) => b.src), null, 1));
