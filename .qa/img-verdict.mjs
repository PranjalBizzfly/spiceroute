// Joins what each image IS (pixels) with how big it is ever SHOWN, and with
// the best official source available, to produce one verdict per image.
// ratio = intrinsic width / largest displayed CSS width.
//   < 1.0  shown larger than its pixels  -> visibly soft
//   < 1.5  soft on high-density screens
//  >= 1.5  sharp
// Usage (from .qa/): node img-verdict.mjs
import fs from "node:fs";

const disp = JSON.parse(fs.readFileSync("screenshots/img-displayed.json", "utf8"));
const inv = JSON.parse(fs.readFileSync("screenshots/img-source-check.json", "utf8"));
const heroSrc = JSON.parse(fs.readFileSync("screenshots/hero-source-check.json", "utf8"));
const invBy = new Map(inv.map((r) => [r.f, r]));
const heroBy = new Map(heroSrc.map((r) => [r.hero, r]));

const rows = [];
for (const d of disp) {
  if (!d.src.startsWith("/images/")) continue;
  const i = invBy.get(d.src);
  if (!i) continue;
  const h = heroBy.get(d.src);
  const srcW = Math.max(i.srcW ?? 0, h?.bestSrcW ?? 0) || null;
  rows.push({
    src: d.src, w: i.w, h: i.h, kb: i.kb, kind: i.kind, edition: i.edition ?? h?.edition ?? null,
    shownW: d.maxW, shownH: d.maxH, atWidth: d.atWidth, fit: d.fit, alt: d.alt, near: d.near,
    routes: d.routeCount, ratio: +(i.w / Math.max(d.maxW, 1)).toFixed(2),
    srcW, srcFile: i.srcFile ?? h?.bestSrcFile ?? null,
    gain: srcW ? +(srcW / i.w).toFixed(2) : null,
  });
}
rows.sort((a, b) => a.ratio - b.ratio);
fs.writeFileSync("screenshots/img-verdict.json", JSON.stringify(rows, null, 1));

const soft = rows.filter((r) => r.ratio < 1);
const softish = rows.filter((r) => r.ratio >= 1 && r.ratio < 1.5);
const unrendered = inv.filter((r) => !disp.some((d) => d.src === r.f));
console.log(`rendered images joined: ${rows.length}`);
console.log(`  shown larger than their pixels (ratio < 1.0): ${soft.length}`);
console.log(`  soft only on 2x screens (1.0-1.5):            ${softish.length}`);
console.log(`  sharp (>= 1.5):                               ${rows.length - soft.length - softish.length}`);
console.log(`files never rendered on any page: ${unrendered.length}`);
console.log(`\n-- shown larger than their pixels, worst first --`);
for (const r of soft)
  console.log(`ratio ${r.ratio}  ${r.w}x${r.h} shown ${r.shownW}x${r.shownH}  src ${r.srcW ?? "-"}${r.gain ? ` (x${r.gain})` : ""}  ${r.src}`);
