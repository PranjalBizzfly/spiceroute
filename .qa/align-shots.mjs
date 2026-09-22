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
  kolkata: "/stories/travel-escapes/kolkata-forever-day-in-a-city",
  interview: "/stories/conversations/ranveer-brar-conversation",
  ladakh: "/stories/destinations/many-shades-of-ladakh",
  petyoga: "/stories/health-healing/fur-all-pet-yoga",
  predictions: "/stories/predictions/predictions-june-2026",
  welcome: "/stories/welcome-aboard/welcome-aboard-september-2026",
  search: "/search",
  searchq: "/search?category=travel-escapes",
  network: "/stories/destinations/network-jeddah",
  trending: "/stories/culture-living/whats-trending-june-2026",
  factfig: "/stories/wildlife-nature/world-earth-day-facts-and-figures",
  nohero: "/stories/culture-living/world-water-day-liquid-lifeline",
  top5: "/stories/culture-living/top-5-events-in-october-2026",
  notfound: "/no-such-page",
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
