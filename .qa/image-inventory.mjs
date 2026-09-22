// Inventory of every image under public/: format, pixel size, and the ones too
// small to look sharp in the layouts that show them. Writes tmp/image-inventory.json.
// Usage (from .qa/): node image-inventory.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk("../public").filter((f) => /\.(webp|png|jpe?g|gif|avif|svg|ico)$/i.test(f));

const rows = [];
for (const f of files) {
  const rel = "/" + path.relative("../public", f).split(path.sep).join("/");
  const ext = path.extname(f).toLowerCase();
  let w = null, h = null;
  if (/\.(webp|png|jpe?g|gif|avif)$/.test(ext)) ({ width: w, height: h } = await sharp(f).metadata());
  rows.push({ file: rel, ext, w, h, kb: Math.round(fs.statSync(f).size / 1024) });
}

const byExt = {};
for (const r of rows) byExt[r.ext] = (byExt[r.ext] ?? 0) + 1;
console.log("total", rows.length, JSON.stringify(byExt));
console.log("non-WebP:", rows.filter((r) => r.ext !== ".webp").map((r) => r.file).join(", ") || "none");
const buckets = { "<300": 0, "300-599": 0, "600-999": 0, "1000+": 0 };
for (const r of rows.filter((r) => r.w)) buckets[r.w < 300 ? "<300" : r.w < 600 ? "300-599" : r.w < 1000 ? "600-999" : "1000+"]++;
console.log("width buckets:", JSON.stringify(buckets));
fs.writeFileSync("tmp/image-inventory.json", JSON.stringify(rows, null, 1));
