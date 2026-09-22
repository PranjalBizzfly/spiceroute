// Hero-section probe: screenshots the first viewport of Home/About/Contact and
// dumps the hero's structure + computed styles, for side-by-side comparison
// between the source site and the local build.
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node hero-probe.mjs <baseUrl> <outDir>
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "https://spiceroutemagazine.in";
const OUT = process.argv[3] ?? "screenshots/hero-src";
const PAGES = ["/", "/about", "/contact"];
const WIDTHS = [1440, 768, 375];

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = {};

for (const path of PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const name = (path === "/" ? "home" : path.slice(1)) + "-" + width;
    await page.screenshot({ path: `${OUT}/${name}.png` });
    if (width === 1440 || width === 375) {
      report[name] = await page.evaluate(() => {
        const out = [];
        const header = document.querySelector("header");
        const pick = (el, depth) => {
          if (depth > 9 || out.length > 260) return;
          const r = el.getBoundingClientRect();
          if (r.top > 1100) return;
          const cs = getComputedStyle(el);
          const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
          const bg = cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 160) : "";
          if (r.height > 0 && (own || bg || el.tagName === "IMG" || el.tagName === "SECTION" || el.tagName === "A" || el.tagName === "VIDEO")) {
            out.push({
              tag: el.tagName.toLowerCase(),
              cls: (typeof el.className === "string" ? el.className : "").slice(0, 90),
              text: own.slice(0, 90),
              src: el.currentSrc || el.getAttribute?.("src") || "",
              href: el.getAttribute?.("href") || "",
              box: [r.x, r.y, r.width, r.height].map(Math.round).join(","),
              font: `${cs.fontFamily.split(",")[0]} ${cs.fontSize}/${cs.lineHeight} w${cs.fontWeight} ${cs.textTransform} ls${cs.letterSpacing}`,
              color: cs.color,
              bgc: cs.backgroundColor,
              bg,
              pad: cs.padding,
              radius: cs.borderRadius,
              border: cs.border,
            });
          }
          for (const c of el.children) pick(c, depth + 1);
        };
        const main = document.body;
        for (const c of main.children) if (c !== header) pick(c, 0);
        return { headerH: header?.getBoundingClientRect().height, items: out };
      });
    }
    await page.close();
  }
}
await fs.writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 1));
await browser.close();
console.log("done", OUT);
