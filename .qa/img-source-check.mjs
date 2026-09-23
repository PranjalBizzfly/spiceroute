// Compares every site image with its own source image inside the edition PDF
// (extract/img/<edition>/index.json holds each embedded image's native size).
// Says, per file: is a higher-resolution official source available?
// Usage (from .qa/): node img-source-check.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

// ---- story slug -> edition folder, from the generated stories data ----
const ts = fs.readFileSync("../src/data/stories.ts", "utf8");
const slugEdition = new Map();
for (const m of ts.matchAll(/slug:\s*"([^"]+)"[\s\S]{0,1200}?date:\s*"([^"]+)"/g)) {
  const [, slug, date] = m;
  slugEdition.set(slug, date.toLowerCase().replace(/\s+/g, "-"));
}

// ---- native sizes of every embedded PDF image, by edition ----
const native = new Map(); // `${edition}/${base}` -> {w,h,file}
for (const ed of fs.readdirSync("extract/img")) {
  const idxPath = `extract/img/${ed}/index.json`;
  if (!fs.existsSync(idxPath)) continue;
  for (const r of JSON.parse(fs.readFileSync(idxPath, "utf8"))) {
    const base = path.basename(r.file).replace(/\.[a-z]+$/i, "");
    const key = `${ed}/${base}`;
    const prev = native.get(key);
    if (!prev || r.width * r.height > prev.w * prev.h) native.set(key, { w: r.width, h: r.height, file: r.file });
  }
}

const editionsExtracted = new Set(fs.readdirSync("extract/img"));
const rows = [];
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else files.push(f);
  }
})("../public/images");

for (const f of files) {
  const url = f.replace(/\\/g, "/").replace("../public", "");
  let meta;
  try { meta = await sharp(f).metadata(); } catch { continue; }
  const base = path.basename(url).replace(/\.[a-z]+$/i, "");
  const parts = url.split("/"); // ['', 'images', kind, ...]
  const kind = parts[2];
  let edition = null;
  if (kind === "extras") edition = parts[3];
  else if (kind === "stories" && parts.length > 4) edition = slugEdition.get(parts[3]) ?? null;
  else if (kind === "stories") edition = slugEdition.get(base) ?? null;

  const src = edition ? native.get(`${edition}/${base}`) : null;
  rows.push({
    f: url, w: meta.width, h: meta.height, kb: Math.round(fs.statSync(f).size / 1024),
    kind, edition,
    srcW: src?.w ?? null, srcH: src?.h ?? null, srcFile: src?.file ?? null,
    extracted: edition ? editionsExtracted.has(edition) : null,
    betterAvailable: src ? src.w > meta.width * 1.05 : null,
  });
}

fs.writeFileSync("screenshots/img-source-check.json", JSON.stringify(rows, null, 1));
const matched = rows.filter((r) => r.srcW);
const better = matched.filter((r) => r.betterAvailable);
console.log(`files ${rows.length}, matched to a PDF source ${matched.length}, unmatched ${rows.length - matched.length}`);
console.log(`higher-res source available for ${better.length}`);
for (const r of better.sort((a, b) => b.srcW / b.w - a.srcW / a.w).slice(0, 40))
  console.log(`${r.w}x${r.h} -> ${r.srcW}x${r.srcH}  ${r.f}`);
const unmatchedByKind = {};
for (const r of rows.filter((r) => !r.srcW)) unmatchedByKind[`${r.kind}${r.extracted === false ? " (edition not extracted)" : ""}`] = (unmatchedByKind[`${r.kind}${r.extracted === false ? " (edition not extracted)" : ""}`] || 0) + 1;
console.log("unmatched:", unmatchedByKind);
