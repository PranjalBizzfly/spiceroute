// Full-length pictures of the printed pages set after an article (.ed-pages),
// so the whole run can be read at once: dead space, stranded pictures and
// repeated text all show up only at full height.
// Usage (from .qa/): node extras-shots.mjs <base> <width> <slugUrl> …
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [BASE, W, ...PATHS] = process.argv.slice(2);
const width = Number(W);
const OUT = "screenshots/extras";
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const p of PATHS) {
  await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
  const pages = page.locator(".ed-pages");
  if (!(await pages.count())) { console.log("no printed pages:", p); continue; }
  // scroll the whole article so every lazy picture loads
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
  });
  await page.waitForTimeout(1500);
  const name = p.split("/").filter(Boolean).pop();
  await pages.screenshot({ path: `${OUT}/${name}-${width}.png` });
  const box = await pages.boundingBox();
  console.log(`${p} → ${name}-${width}.png  ${Math.round(box.height)}px tall`);
}
await browser.close();
