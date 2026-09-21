// Full-page screenshots of every page type for the alignment pass.
// Usage: node align-shots.mjs [baseUrl] [tag] [widths]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3140";
const TAG = process.argv[3] ?? "before";
const WIDTHS = (process.argv[4] ?? "390,1440").split(",").map(Number);
const PAGES = {
  home: "/",
  about: "/about",
  contact: "/contact",
  archive: "/inflight-magazine",
  edition: "/inflight-magazine/september-2026",
  pdfonly: "/inflight-magazine/april-2024",
  kolkata: "/stories/travel/kolkata-forever-day-in-a-city",
  interview: "/stories/interviews/ranveer-brar-conversation",
  ladakh: "/stories/destinations/ladakh-roof-of-the-world",
  petyoga: "/stories/wellness/fur-all-pet-yoga",
  predictions: "/stories/predictions/predictions-june-2026",
  welcome: "/stories/welcome-aboard/welcome-aboard-september-2026",
};
const only = process.argv[5]?.split(",");

const dir = `screenshots/align-${TAG}`;
await fs.mkdir(dir, { recursive: true });
const browser = await chromium.launch();
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const [name, path] of Object.entries(PAGES)) {
    if (only && !only.includes(name)) continue;
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    // lazy images: scroll through once
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    // slices, so each image stays legible
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = w < 700 ? 1600 : 1200;
    for (let y = 0, k = 0; y < h; y += step, k++) {
      await page.screenshot({
        path: `${dir}/${name}-${w}-${String(k).padStart(2, "0")}.png`,
        fullPage: true,
        clip: { x: 0, y, width: w, height: Math.min(step, h - y) },
      });
    }
  }
  await ctx.close();
}
await browser.close();
console.log("done", dir);
