// For each story hero image, finds the printed page it came from (from
// heroImageSource in the generated stories data) and reports the largest
// embedded image available on that page in the official PDF. That is the
// ceiling for how sharp the hero can be made from the source.
// Usage (from .qa/): node hero-source-check.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const MONTHS = "january february march april may june july august september october november december".split(" ");
const ts = fs.readFileSync("../src/data/stories.ts", "utf8");

// one record per story object in the array
const stories = [];
for (const chunk of ts.split(/\n  \{\n/).slice(1)) {
  const get = (k) => chunk.match(new RegExp(`${k}:\\s*"([^"]*)"`))?.[1] ?? null;
  const slug = get("slug");
  if (!slug) continue;
  const hero = get("heroImage");
  const source = get("heroImageSource") ?? "";
  const date = (get("date") ?? "").toLowerCase();
  const pages = [...source.matchAll(/pages?\s*(\d+)(?:\s*[-–]\s*(\d+))?/gi)].flatMap((m) => [Number(m[1]), m[2] ? Number(m[2]) : null].filter(Boolean));
  // "Spice Route - Sept 2026" -> september-2026
  const mm = source.match(/([A-Za-z]+)\s+(\d{4})/);
  let edition = null;
  if (date) {
    const [mon, yr] = date.split(" ");
    edition = `${mon}-${yr}`;
  } else if (mm) {
    const mon = MONTHS.find((m) => m.startsWith(mm[1].toLowerCase().slice(0, 3)));
    edition = mon ? `${mon}-${mm[2]}` : null;
  }
  stories.push({ slug, hero, source, edition, pages });
}

// embedded images per edition/page
const byPage = new Map();
for (const ed of fs.readdirSync("extract/img")) {
  const idx = `extract/img/${ed}/index.json`;
  if (!fs.existsSync(idx)) continue;
  for (const r of JSON.parse(fs.readFileSync(idx, "utf8"))) {
    const k = `${ed}/${r.page}`;
    if (!byPage.has(k)) byPage.set(k, []);
    byPage.get(k).push(r);
  }
}

const rows = [];
for (const s of stories) {
  if (!s.hero) continue;
  const file = `../public${s.hero}`;
  let meta = null;
  try { meta = await sharp(file).metadata(); } catch { /* missing */ }
  const cands = s.pages.flatMap((p) => byPage.get(`${s.edition}/${p}`) ?? []);
  const best = cands.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
  rows.push({
    slug: s.slug, hero: s.hero, edition: s.edition, pages: s.pages,
    w: meta?.width ?? null, h: meta?.height ?? null,
    bestSrcW: best?.width ?? null, bestSrcH: best?.height ?? null, bestSrcFile: best?.file ?? null,
    candidates: cands.length,
  });
}
fs.writeFileSync("screenshots/hero-source-check.json", JSON.stringify(rows, null, 1));

const withSrc = rows.filter((r) => r.bestSrcW && r.w);
const better = withSrc.filter((r) => r.bestSrcW > r.w * 1.15);
console.log(`heroes ${rows.length}, matched to a printed page ${withSrc.length}`);
console.log(`bigger source on that page for ${better.length}:`);
for (const r of better.sort((a, b) => a.w - b.w).slice(0, 50))
  console.log(`${String(r.w).padStart(4)}x${r.h} -> ${r.bestSrcW}x${r.bestSrcH}  ${r.slug}  (${r.edition} p${r.pages})`);
