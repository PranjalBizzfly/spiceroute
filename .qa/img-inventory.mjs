// Every image file under public/images with its true pixel size, format and
// weight. Writes .qa/screenshots/img-inventory.json.
// Usage (from .qa/): node img-inventory.mjs
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
    else files.push(f);
  }
})("../public/images");

const rows = [];
for (const f of files) {
  const url = f.replace(/\\/g, "/").replace("../public", "");
  try {
    const m = await sharp(f).metadata();
    rows.push({ f: url, w: m.width, h: m.height, fmt: m.format, kb: Math.round(fs.statSync(f).size / 1024) });
  } catch (e) {
    rows.push({ f: url, err: String(e).slice(0, 80) });
  }
}
fs.mkdirSync("screenshots", { recursive: true });
fs.writeFileSync("screenshots/img-inventory.json", JSON.stringify(rows, null, 1));

const byFmt = {};
const byDir = {};
for (const r of rows) {
  byFmt[r.fmt ?? "ERR"] = (byFmt[r.fmt ?? "ERR"] || 0) + 1;
  const d = r.f.split("/").slice(0, 3).join("/");
  byDir[d] = (byDir[d] || 0) + 1;
}
console.log("files", rows.length, byFmt);
console.log(byDir);
const small = rows.filter((r) => r.w && r.w < 700).sort((a, b) => a.w - b.w);
console.log("\nunder 700px wide:", small.length);
for (const r of small) console.log(`${r.w}x${r.h} ${r.kb}kB ${r.f}`);
