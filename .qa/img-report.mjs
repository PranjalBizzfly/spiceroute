// Final tally for the image audit. Reclassifies the edition covers by their
// real (non-ambient) display size, and splits the soft images into those that
// can be improved from an official source and those already at source ceiling.
// Usage (from .qa/): node img-report.mjs
import fs from "node:fs";

const v = JSON.parse(fs.readFileSync("screenshots/img-verdict.json", "utf8"));
const chrome = JSON.parse(fs.readFileSync("screenshots/chrome-img.json", "utf8"));
const realRatio = new Map(chrome.filter((c) => c.ratio).map((c) => [c.src, c.ratio]));

const rows = v.map((r) => {
  const real = realRatio.get(r.src);
  return { ...r, ratio: real ?? r.ratio, ambientOnly: real != null && real >= 1.5 && r.ratio < 1 };
});

const soft = rows.filter((r) => r.ratio < 1);
const retina = rows.filter((r) => r.ratio >= 1 && r.ratio < 1.5);
const sharp = rows.filter((r) => r.ratio >= 1.5);
const fixed = ["/images/stories/saving-the-greater-one-horned-rhino.webp", "/images/stories/guru-purnima-info-corner.webp"];

console.log("=== IMAGE AUDIT TALLY (rendered images) ===");
console.log(`rendered and measured:            ${rows.length}`);
console.log(`  sharp (>=1.5x displayed size):  ${sharp.length}`);
console.log(`  adequate (1.0-1.5x):            ${retina.length}`);
console.log(`  shown larger than pixels (<1x): ${soft.length}`);
console.log(`\ncovers reclassified by real display (blurred backdrop ignored): ${rows.filter((r) => r.ambientOnly).length}`);

const softNow = soft.filter((r) => !fixed.includes(r.src));
console.log(`\nremaining soft after my fixes: ${softNow.length}`);
const byGroup = {};
for (const r of softNow) {
  const g = /top-5-events|whats-trending/.test(r.src) ? "Top 5 / What's Trending (low-res in the PDF itself)"
    : r.kind === "extras" ? "printed-page extras"
    : r.src.startsWith("/images/hero/") ? "site artwork"
    : "story pictures";
  (byGroup[g] ??= []).push(r);
}
for (const [g, list] of Object.entries(byGroup)) console.log(`  ${list.length.toString().padStart(3)}  ${g}`);

console.log(`\n-- the only soft images that are NOT at the PDF's own ceiling --`);
for (const r of softNow.filter((x) => x.gain && x.gain > 1.2)) console.log(`   ${r.src} ${r.w}px shown ${r.shownW} (source x${r.gain})`);
const noSource = softNow.filter((r) => !r.srcW && !/top-5-events/.test(r.src));
console.log(`\n-- soft with no PDF source located --`);
for (const r of noSource) console.log(`   ${r.src} ${r.w}x${r.h} shown ${r.shownW} (ratio ${r.ratio})`);
