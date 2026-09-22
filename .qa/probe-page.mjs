// Runs the responsive-audit probe on a handful of routes and prints every
// finding in full (the sweep only keeps a trimmed summary).
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node probe-page.mjs <baseUrl> <widths> <route> [route ...]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [BASE, widthArg, ...ROUTES] = process.argv.slice(2);
const WIDTHS = widthArg.split(",").map(Number);
const src = await fs.readFile(new URL("./responsive-audit.mjs", import.meta.url), "utf8");
const probeSrc = src.slice(src.indexOf("const probe = () =>") + "const probe = ".length, src.indexOf("async function settle"));

const browser = await chromium.launch();
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, reducedMotion: "reduce" });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    await page.goto(BASE + route, { waitUntil: "load" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const p = await page.evaluate(`(${probeSrc.trim().replace(/;$/, "")})()`);
    const out = Object.fromEntries(Object.entries(p).filter(([, v]) => (Array.isArray(v) ? v.length : typeof v === "number" && v)));
    delete out.shown;
    console.log(`\n== ${route} @${w}`, JSON.stringify(out, null, 1));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
