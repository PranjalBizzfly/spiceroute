// Data-level check of every story image: file exists, real WebP, size, alt,
// source mapping, and visual duplicates across different stories (a 16x16
// greyscale fingerprint, so a re-used photograph is caught under any name).
// Usage (from .qa/): node story-image-check.mjs
import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const sharp = require("../node_modules/sharp");

const src = await fs.readFile("../src/data/stories.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)(() => ({}), mod, mod.exports);
const stories = mod.exports.stories;

const rows = [];
for (const s of stories) {
  if (s.heroImage) rows.push({ slug: s.slug, role: "hero", src: s.heroImage, alt: s.heroImageAlt, source: s.heroImageSource });
  for (const g of s.gallery ?? []) rows.push({ slug: s.slug, role: "gallery", src: g.src, alt: g.alt, source: g.pdfPages ? `PDF pages ${g.pdfPages.join(",")}` : undefined });
}

const issues = { missingFile: [], notWebp: [], noAlt: [], genericAlt: [], noSource: [], small: [], dupAcrossStories: [] };
const prints = [];
for (const r of rows) {
  const file = `../public${r.src}`;
  let buf;
  try {
    buf = await fs.readFile(file);
  } catch {
    issues.missingFile.push(r.src);
    continue;
  }
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP" || !r.src.endsWith(".webp")) issues.notWebp.push(r.src);
  const meta = await sharp(buf).metadata();
  r.w = meta.width;
  r.h = meta.height;
  if (!r.alt?.trim()) issues.noAlt.push(r.src);
  else if (r.alt.trim().length < 12 || /^(image|photo|picture)\b/i.test(r.alt)) issues.genericAlt.push(`${r.src}: ${r.alt}`);
  if (r.role === "hero" && !r.source) issues.noSource.push(r.src);
  if (r.role === "hero" && meta.width < 400) issues.small.push(`${r.slug} hero ${meta.width}x${meta.height}`);
  const px = await sharp(buf).resize(16, 16, { fit: "fill" }).greyscale().raw().toBuffer();
  prints.push({ r, px });
}
for (let i = 0; i < prints.length; i++)
  for (let j = i + 1; j < prints.length; j++) {
    const a = prints[i], b = prints[j];
    if (a.r.slug === b.r.slug) continue;
    let d = 0;
    for (let k = 0; k < 256; k++) d += Math.abs(a.px[k] - b.px[k]);
    if (d / 256 < 6) issues.dupAcrossStories.push(`${a.r.slug} ${a.r.role} ≈ ${b.r.slug} ${b.r.role} (${a.r.alt === b.r.alt ? "same alt" : "different alt"})`);
  }

const noHero = stories.filter((s) => !s.heroImage).map((s) => s.slug);
await fs.writeFile("tmp/story-image-check.json", JSON.stringify({ stories: stories.length, images: rows.length, noHero, issues, rows }, null, 1));
console.log(`${stories.length} stories, ${rows.length} images, ${noHero.length} without hero${noHero.length ? ": " + noHero.join(", ") : ""}`);
for (const [k, v] of Object.entries(issues)) console.log(`${k}: ${v.length}${v.length ? "\n  " + v.slice(0, 12).join("\n  ") : ""}`);
