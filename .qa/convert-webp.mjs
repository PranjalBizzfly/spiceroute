// Converts every raster image under public/images to WebP and localises the
// edition covers that were hot-linked from the WordPress site.
//
// - Photographs (JPEG): lossy WebP, q80, effort 6. Pixel size is kept as is
//   (story images were already capped at 1600px by write-stories.mjs).
// - Logos (PNG with transparency): whichever is smaller of lossless and
//   near-lossless WebP, so flat colour and text edges stay crisp.
// - Remote covers: downloaded and scaled to 900px wide, the width of the other
//   covers in public/images/covers, keeping their proportions.
// - spice-route-logo.png stays as well, because it is the favicon.
// Originals are moved to backup/public-images-original/, not deleted.
//
// Usage (from .qa/): node convert-webp.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const PUBLIC = "../public";
const BACKUP = "backup/public-images-original";
const KEEP_ORIGINAL = new Set(["images/spice-route-logo.png"]);
const COVER_W = 900;

const REMOTE_COVERS = {
  "september-2026": "https://spiceroutemagazine.in/wp-content/uploads/2026/09/Hires-Cover_Sep-scaled.jpg",
  "august-2026": "https://spiceroutemagazine.in/wp-content/uploads/2026/08/Hires-Cover_Aug-scaled.jpg",
  "may-2026": "https://spiceroutemagazine.in/wp-content/uploads/2026/05/HR-Cover_May-2026-788x1024.png",
  "april-2026": "https://spiceroutemagazine.in/wp-content/uploads/2026/04/Screenshot-2026-04-01-at-10.11.47-AM-787x1024.png",
  "march-2026": "https://spiceroutemagazine.in/wp-content/uploads/2026/03/SpiceRoute-March-2026-Lowres_pages-to-jpg-0001-788x1024.jpg",
  "september-2025": "https://spiceroutemagazine.in/wp-content/uploads/2025/09/Cover_Sep25-scaled-788x1024.jpg",
  "june-2025": "https://spiceroutemagazine.in/wp-content/uploads/2026/03/june-cover-791x1024.png",
  "may-2025": "https://spiceroutemagazine.in/wp-content/uploads/2025/05/WhatsApp-Image-2025-05-01-at-10.35.24-773x1024.jpeg",
  "september-2024": "https://spiceroutemagazine.in/wp-content/uploads/2024/12/september2024-cover-789x1024.png",
};

const photo = (img) => img.webp({ quality: 80, effort: 6, smartSubsample: true });

async function logo(file) {
  const [lossless, near] = await Promise.all([
    sharp(file).webp({ lossless: true, effort: 6 }).toBuffer(),
    sharp(file).webp({ nearLossless: true, quality: 60, effort: 6 }).toBuffer(),
  ]);
  return lossless.length <= near.length ? lossless : near;
}

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const rows = [];
let before = 0;
let after = 0;

// 1. Remote covers -> public/images/covers/<slug>.webp
for (const [slug, url] of Object.entries(REMOTE_COVERS)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const dest = `${PUBLIC}/images/covers/${slug}.webp`;
  let img = sharp(buf).flatten({ background: "#ffffff" });
  if (meta.width > COVER_W) img = img.resize({ width: COVER_W });
  const info = await photo(img).toFile(dest);
  before += buf.length;
  after += info.size;
  rows.push([`remote ${slug}`, `${meta.width}x${meta.height}`, `${info.width}x${info.height}`, buf.length, info.size]);
}

// 2. Local JPEG/PNG -> WebP next to the original
for (const file of await walk(`${PUBLIC}/images`)) {
  const ext = path.extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".png"].includes(ext)) continue;
  const rel = path.relative(PUBLIC, file).split(path.sep).join("/");
  const dest = file.slice(0, -ext.length) + ".webp";
  const meta = await sharp(file).metadata();
  const buf = meta.hasAlpha ? await logo(file) : await photo(sharp(file)).toBuffer();
  await fs.writeFile(dest, buf);
  const out = await sharp(buf).metadata();
  if (out.width !== meta.width || out.height !== meta.height) throw new Error(`${rel}: size changed`);
  const size = (await fs.stat(file)).size;
  before += size;
  after += buf.length;
  rows.push([rel, `${meta.width}x${meta.height}`, `${out.width}x${out.height}`, size, buf.length]);

  if (!KEEP_ORIGINAL.has(rel)) {
    const bak = path.join(BACKUP, rel);
    await fs.mkdir(path.dirname(bak), { recursive: true });
    await fs.rename(file, bak);
  }
}

await fs.writeFile("tmp/convert-webp-report.json", JSON.stringify(rows, null, 1));
const bigger = rows.filter((r) => r[4] > r[3]);
console.log(`converted ${rows.length} images: ${(before / 1024).toFixed(0)}K -> ${(after / 1024).toFixed(0)}K`);
if (bigger.length) console.log("larger than source:", bigger.map((r) => r[0]).join(", "));
