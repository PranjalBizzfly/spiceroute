// Screenshots of article pages for the interactive-article work: viewport
// captures at chosen scroll positions (the gallery, the rail) and the lightbox.
// Usage: node story-shots.mjs <base> <width> <path> [<path> …]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [BASE, W, ...PATHS] = process.argv.slice(2);
const width = Number(W);
const OUT = "screenshots/stories";
await fs.mkdir(OUT, { recursive: true });
const THEME = process.env.THEME ?? "light";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, deviceScaleFactor: 1, colorScheme: THEME });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

for (const p of PATHS) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  const name = p.split("/").pop() + `-${THEME}-${width}`;
  await page.screenshot({ path: `${OUT}/${name}-top.png` });

  // the first gallery, in view
  const gallery = page.locator(".ed-gallery").first();
  if (await gallery.count()) {
    await gallery.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -120));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}-gallery.png` });

    // lightbox, opened from the first photograph
    await gallery.locator(".ed-gallery__item").first().click();
    await page.waitForSelector(".ed-lightbox");
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}-lightbox.png` });
    await page.keyboard.press("Escape");
  }

  // half-way down, to catch the rail and progress bar
  await page.evaluate(() => {
    const b = document.querySelector(".ed-story__body");
    if (b) window.scrollTo(0, b.getBoundingClientRect().top + window.scrollY + b.offsetHeight * 0.5);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-mid.png` });
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no page errors");
