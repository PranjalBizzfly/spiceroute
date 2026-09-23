// Visual audit of the printed pages that now read on from each article:
// every story page that carries them, at phone, tablet and desktop. Checks
// for overflow, distorted or letterboxed pictures, slivers, stray source
// labels, and blocks left empty.
// Usage (from .qa/): node extras-visual-audit.mjs [baseUrl] [limit]
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const LIMIT = Number(process.argv[3] ?? 0);
const WIDTHS = [375, 768, 1440];
const LABELS = /printed page|pdf page|also printed in this edition|extra content|additional content|added from pdf|pdf content/i;

const src = fs.readFileSync("../src/data/extras.ts", "utf8");
const extras = JSON.parse(src.slice(src.indexOf("= {") + 2, src.lastIndexOf("};") + 1));
const storiesSrc = fs.readFileSync("../src/data/stories.ts", "utf8");
const hrefOf = (slug) => {
  const o = storiesSrc.split(/\n  \{\r?\n    id: /).find((x) => x.includes(`slug: "${slug}"`));
  const cat = o && (o.match(/category: "([^"]*)"/) || [])[1];
  return cat ? `/stories/${cat}/${slug}` : null;
};
let routes = Object.keys(extras).map(hrefOf).filter(Boolean);
if (LIMIT) routes = routes.slice(0, LIMIT);

const browser = await chromium.launch();
const problems = [];
let checked = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, reducedMotion: "reduce" });
  const queue = [...routes];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      const page = await ctx.newPage();
      while (queue.length) {
        const route = queue.shift();
        try {
          await page.goto(BASE + route, { waitUntil: "load", timeout: 180000 });
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += 900) {
              scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 25));
            }
          });
          const found = await page.evaluate(() => {
            const s = document.querySelector(".ed-pages");
            if (!s) return { none: true };
            const imgs = [...s.querySelectorAll("img")];
            const shape = imgs.filter((i) => {
              const r = i.getBoundingClientRect();
              if (!i.naturalWidth || r.width < 2) return false;
              return Math.abs(i.naturalWidth / i.naturalHeight - r.width / r.height) / (i.naturalWidth / i.naturalHeight) > 0.08;
            }).length;
            const sliver = imgs.filter((i) => {
              const r = i.getBoundingClientRect();
              return r.width > 0 && (r.width < 56 || r.height < 28);
            }).length;
            const empty = [...s.querySelectorAll(".ed-pagefeat")].filter((b) => !b.textContent.trim() && !b.querySelector("img")).length;
            return {
              over: [...s.querySelectorAll("*")].filter((e) => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
              }).length,
              hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
              shape,
              sliver,
              empty,
              text: s.innerText,
            };
          });
          checked++;
          if (found.none) continue;
          const label = (found.text.match(LABELS) || [])[0];
          if (found.over) problems.push(`${route} @${w}: ${found.over} element(s) past the edge`);
          if (found.hscroll) problems.push(`${route} @${w}: page scrolls sideways`);
          if (found.shape) problems.push(`${route} @${w}: ${found.shape} picture(s) distorted or letterboxed`);
          if (found.sliver) problems.push(`${route} @${w}: ${found.sliver} picture(s) rendered as slivers`);
          if (found.empty) problems.push(`${route} @${w}: ${found.empty} empty block(s)`);
          if (label) problems.push(`${route} @${w}: source label on the page ("${label}")`);
        } catch (e) {
          problems.push(`${route} @${w}: ${e.message.slice(0, 70)}`);
        }
      }
      await page.close();
    }),
  );
  await ctx.close();
  console.log(`width ${w} done`);
}
await browser.close();
console.log(`${routes.length} story pages × ${WIDTHS.length} widths = ${checked} page loads`);
if (!problems.length) console.log("VISUAL AUDIT: no problems");
else {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.log("  " + p);
}
