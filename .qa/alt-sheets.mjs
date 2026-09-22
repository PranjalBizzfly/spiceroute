// Contact sheets for reviewing alt text against the actual photographs:
// each tile is one story image with its number and its alt text beneath it.
// Input: tmp/image-rows.json ([{kind, slug, src, alt, w}]). Output: tmp/altsheets/sheet-NN.png
// Usage (from .qa/): node alt-sheets.mjs
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const rows = JSON.parse(await fs.readFile("tmp/image-rows.json", "utf8"));
const PER = 20, COLS = 5, TW = 300, IH = 220, CH = 110, GAP = 8;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text, max = 44) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 6);
}

await fs.rm("tmp/altsheets", { recursive: true, force: true });
await fs.mkdir("tmp/altsheets", { recursive: true });
const index = [];
for (let s = 0; s * PER < rows.length; s++) {
  const batch = rows.slice(s * PER, (s + 1) * PER);
  const layers = [];
  for (const [i, r] of batch.entries()) {
    const n = s * PER + i;
    index.push({ n, ...r });
    const x = (i % COLS) * (TW + GAP), y = Math.floor(i / COLS) * (IH + CH + GAP);
    const img = await sharp(`../public${r.src}`).resize(TW, IH, { fit: "contain", background: "#ffffff" }).toBuffer();
    layers.push({ input: img, left: x, top: y });
    const lines = wrap(`#${n} ${r.alt ?? "(no alt)"}`);
    const svg = `<svg width="${TW}" height="${CH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fffbe6"/>${lines
      .map((l, k) => `<text x="6" y="${17 + k * 17}" font-family="Arial" font-size="13" fill="#111">${esc(l)}</text>`)
      .join("")}</svg>`;
    layers.push({ input: Buffer.from(svg), left: x, top: y + IH });
  }
  const rowsN = Math.ceil(batch.length / COLS);
  await sharp({ create: { width: COLS * (TW + GAP), height: rowsN * (IH + CH + GAP), channels: 3, background: "#777777" } })
    .composite(layers)
    .png()
    .toFile(`tmp/altsheets/sheet-${String(s).padStart(2, "0")}.png`);
}
await fs.writeFile("tmp/altsheets/index.json", JSON.stringify(index, null, 1));
console.log(`${Math.ceil(rows.length / PER)} sheets, ${rows.length} images`);
