// Finds story hero images that are really a copy of a photograph filed under a
// DIFFERENT story (cross-story substitution). Compares a 32x32 grey signature
// of every hero against every story/extras image.
// Usage (from .qa/): node hero-mismatch-scan.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const sig = async (f) => sharp(f).resize(32, 32, { fit: "fill" }).grayscale().raw().toBuffer();
const diff = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };

const all = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.webp$/i.test(f)) all.push(f.replace(/\\/g, "/"));
  }
})("../public/images/stories");

const heroes = all.filter((f) => f.split("/").length === 5); // ../public/images/stories/<name>.webp
const gallery = all.filter((f) => f.split("/").length > 5);
console.log(`heroes ${heroes.length}, gallery files ${gallery.length}`);

const gsig = new Map();
for (const g of gallery) gsig.set(g, await sig(g));

const hits = [];
for (const h of heroes) {
  const slug = path.basename(h, ".webp");
  const hs = await sig(h);
  let best = null;
  for (const [g, s] of gsig) {
    const d = diff(hs, s);
    if (!best || d < best.d) best = { g, d };
  }
  if (best && best.d < 6) {
    const owner = best.g.split("/")[4];
    const own = slug === owner || slug.replace(/-v\d+$/, "") === owner;
    hits.push({ hero: h, slug, match: best.g, owner, d: +best.d.toFixed(1), own });
  }
}
fs.writeFileSync("screenshots/hero-mismatch.json", JSON.stringify(hits, null, 1));
const cross = hits.filter((h) => !h.own);
console.log(`\nheroes that duplicate a gallery photo: ${hits.length} (same story ${hits.length - cross.length}, DIFFERENT story ${cross.length})`);
for (const h of cross) console.log(`  ${h.slug}\n      <- ${h.match.replace("../public", "")} (diff ${h.d})`);
