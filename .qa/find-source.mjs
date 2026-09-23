// Finds the best-matching embedded PDF image for a given site image, by 32x32
// grey signature across every extracted edition. Says whether a
// higher-resolution official original exists.
// Usage (from .qa/): node find-source.mjs <path-to-site-image> [more...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const sig = (f) => sharp(f).resize(32, 32, { fit: "fill" }).grayscale().raw().toBuffer();
const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };

const cands = [];
for (const ed of fs.readdirSync("extract/img")) {
  const dir = `extract/img/${ed}`;
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) if (/\.(jpe?g|png)$/i.test(f)) cands.push(`${dir}/${f}`);
}
console.log(`candidate source images: ${cands.length}`);
const csig = [];
for (const c of cands) csig.push([c, await sig(c), await sharp(c).metadata()]);

for (const target of process.argv.slice(2)) {
  const t = await sig(target);
  const tm = await sharp(target).metadata();
  const scored = csig.map(([c, s, m]) => ({ c, d: diff(t, s), w: m.width, h: m.height })).sort((a, b) => a.d - b.d).slice(0, 5);
  console.log(`\n${target}  (${tm.width}x${tm.height})`);
  for (const s of scored) console.log(`   diff ${s.d.toFixed(1).padStart(5)}  ${s.w}x${s.h}  ${s.c}${s.w > tm.width ? "   <-- BIGGER" : ""}`);
}
