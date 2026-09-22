// Visual responsive review: full-page screenshots of one page per template at
// a given width, tiled into side-by-side strips so a whole page fits one view.
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node rwd-strips.mjs <baseUrl> <width> [route ...]
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");

const BASE = process.argv[2] ?? "http://localhost:3140";
const W = Number(process.argv[3] ?? 320);
const ROUTES = process.argv.slice(4).length
  ? process.argv.slice(4)
  : ["/", "/about", "/contact", "/inflight-magazine", "/inflight-magazine/september-2026", "/stories/conversations/ranveer-brar-conversation", "/search", "/this-page-does-not-exist"];
const OUT = "screenshots/rwd-strips";
const STRIP_H = W < 700 ? 1500 : 1100; // page height per strip
const PER_ROW = W < 700 ? 6 : W < 1100 ? 3 : 2;

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, reducedMotion: "reduce" });
for (const route of ROUTES) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
  // Load lazy images, then drop the sticky header so it isn't repeated
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.addStyleTag({ content: "header{position:static!important} nextjs-portal{display:none!important}" });
  const buf = await page.screenshot({ fullPage: true });
  const { height: H } = await sharp(buf).metadata();
  const n = Math.ceil(H / STRIP_H);
  const name = route === "/" ? "home" : route.slice(1).replace(/[/?=&]/g, "_");
  // Sheets of PER_ROW strips side by side
  for (let s = 0; s < n; s += PER_ROW) {
    const tiles = [];
    const count = Math.min(PER_ROW, n - s);
    for (let k = 0; k < count; k++) {
      const top = (s + k) * STRIP_H;
      const h = Math.min(STRIP_H, H - top);
      tiles.push({ input: await sharp(buf).extract({ left: 0, top, width: W, height: h }).toBuffer(), left: k * (W + 12), top: 0 });
    }
    await sharp({ create: { width: count * (W + 12), height: STRIP_H, channels: 3, background: "#ff00ff" } })
      .composite(tiles)
      .png()
      .toFile(`${OUT}/${W}-${name}-${String(s / PER_ROW + 1).padStart(2, "0")}.png`);
  }
  console.log(route, `${H}px -> ${Math.ceil(n / PER_ROW)} sheet(s)`);
  await page.close();
}
await browser.close();
