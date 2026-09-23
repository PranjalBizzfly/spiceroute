// Renders a live page but with the stylesheets taken straight from src/app/*.css
// instead of the built chunks, so a build landing mid-session (stale or missing
// chunk files) cannot corrupt what we measure.
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node render-with-source-css.mjs <url> <width> <selector> <outName>
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [url, widthArg, selector, outName] = process.argv.slice(2);
const width = Number(widthArg);

const order = ["globals", "editorial", "chrome", "hero", "footer", "home", "reading", "article", "pages", "slide", "typography", "motion", "hero-slide"];
let css = "";
for (const name of order) {
  const text = await fs.readFile(`../src/app/${name}.css`, "utf8").catch(() => null);
  if (text) css += `\n/* ${name}.css */\n${text}`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
await page.goto(url, { waitUntil: "load", timeout: 120000 });
// drop the built stylesheets, then add the source ones
await page.evaluate(() => {
  for (const l of document.querySelectorAll('link[rel="stylesheet"], style')) l.remove();
});
await page.addStyleTag({ content: css });
await page.evaluate(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(600);

const el = page.locator(selector).first();
const info = await el.evaluate((n) => {
  const cs = getComputedStyle(n);
  const rows = [...n.querySelectorAll(".ed-pagefeat__row")].map((r) => ({
    display: getComputedStyle(r).display,
    box: `${Math.round(r.getBoundingClientRect().width)}x${Math.round(r.getBoundingClientRect().height)}`,
    plates: [...r.querySelectorAll(".ed-pagefeat__plate")].map((p) => {
      const b = p.getBoundingClientRect();
      return `${Math.round(b.width)}x${Math.round(b.height)}`;
    }),
  }));
  return { display: cs.display, box: `${Math.round(n.getBoundingClientRect().width)}x${Math.round(n.getBoundingClientRect().height)}`, rows };
});
console.log(JSON.stringify(info, null, 1));
await el.screenshot({ path: `screenshots/sections/${outName}.png` });
await browser.close();
