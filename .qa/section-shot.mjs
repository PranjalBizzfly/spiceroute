// Screenshot one element (by selector) of a route at several widths.
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node section-shot.mjs <baseUrl> <widths> <route> <selector> [name]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [BASE, widthArg, route, selector, name = "section"] = process.argv.slice(2);
const OUT = "screenshots/sections";
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const w of widthArg.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await page.addStyleTag({ content: "header{position:static!important} nextjs-portal{display:none!important}" });
  await page.waitForTimeout(400);
  await page.locator(selector).first().screenshot({ path: `${OUT}/${name}-${w}.png` });
  await page.close();
}
await browser.close();
