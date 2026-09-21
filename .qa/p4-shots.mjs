// Review screenshots for Prompt 4: full-page captures (reduced motion, so
// every reveal is visible), cut into viewable slices.
// Usage: node p4-shots.mjs <base> <width> <path> [<path> …]
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const sharp = createRequire(import.meta.url)("../node_modules/sharp");
const [BASE, W, ...PATHS] = process.argv.slice(2);
const width = Number(W);
const OUT = "screenshots/p4";
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const THEME = process.env.THEME ?? "light"; // light | dark (emulated prefers-color-scheme)
const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, reducedMotion: "reduce", deviceScaleFactor: 1, colorScheme: THEME });
const page = await ctx.newPage();
for (const p of PATHS) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  // load every lazy image
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))));
  await page.waitForTimeout(400);
  const name = (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_")) + `-${THEME}-${width}`;
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  const meta = await sharp(file).metadata();
  const slice = width < 700 ? 1700 : 1500;
  const n = Math.ceil(meta.height / slice);
  for (let i = 0; i < n; i++) {
    const h = Math.min(slice, meta.height - i * slice);
    await sharp(file).extract({ left: 0, top: i * slice, width: meta.width, height: h })
      .resize({ width: Math.min(meta.width, 900) }).jpeg({ quality: 78 }).toFile(`${OUT}/${name}-part${i + 1}.jpg`);
  }
  console.log(`${name}: ${meta.height}px → ${n} slices`);
}
await browser.close();
