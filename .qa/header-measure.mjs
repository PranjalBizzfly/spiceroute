// Measures the desktop header row at given widths: container box, each child's
// box and the right-hand gutter, optionally with extra CSS injected (to try a
// fix before rebuilding).
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node header-measure.mjs <baseUrl> <widths> [cssFile]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const [BASE, widthArg, cssFile] = process.argv.slice(2);
const css = cssFile ? await fs.readFile(cssFile, "utf8") : "";
const browser = await chromium.launch();
for (const w of widthArg.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: 600 } });
  await page.goto(BASE + "/about", { waitUntil: "load" });
  if (css) await page.addStyleTag({ content: css });
  const m = await page.evaluate(() => {
    const bar = document.querySelector(".ed-header__bar");
    const cs = getComputedStyle(bar);
    const box = (el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.left)}-${Math.round(r.right)}`; };
    const right = Math.max(...[...bar.children].filter((c) => c.getClientRects().length).map((c) => c.getBoundingClientRect().right));
    return {
      bar: box(bar), padR: cs.paddingRight,
      kids: [...bar.children].filter((c) => c.getClientRects().length).map((c) => `${c.className.split(" ").pop()} ${box(c)}`),
      rightGutter: Math.round(innerWidth - right), overflow: bar.scrollWidth > bar.clientWidth,
    };
  });
  console.log(w, JSON.stringify(m));
  await page.close();
}
await browser.close();
