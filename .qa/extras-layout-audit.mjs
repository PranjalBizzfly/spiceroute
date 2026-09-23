// Checks every article that carries printed pages after it (.ed-pages) for the
// faults that made those pages read as a jumble: text running past the column,
// the same line set twice over, a picture left at a size nothing else on the
// page shares, and a row of pictures that does not fill its column.
// Usage (from .qa/): node extras-layout-audit.mjs <base> [<width>]
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const width = Number(process.argv[3] ?? 1280);
const paths = fs.readFileSync("tmp/extras-urls.txt", "utf8").split(/\r?\n/).filter(Boolean);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
const page = await ctx.newPage();
const faults = [];

for (const p of paths) {
  // the dev server sometimes drops a navigation while it recompiles
  for (let go = 0; ; go++) {
    try { await page.goto(BASE + p, { waitUntil: "domcontentloaded" }); break; }
    catch (e) { if (go > 2) throw e; await page.waitForTimeout(700); }
  }
  if (!(await page.locator(".ed-pages").count())) continue;
  const found = await page.evaluate(() => {
    const out = [];
    const pages = document.querySelector(".ed-pages");
    const box = pages.getBoundingClientRect();
    // the same line set twice on one page — the PDF's text layer stamps a
    // caption once per photograph. (The same web address printed on two
    // different pages of the edition is not a fault: it was printed twice.)
    for (const feat of pages.querySelectorAll(".ed-pagefeat")) {
      const lines = [...feat.querySelectorAll(".ed-pagefeat__text p, .ed-pagefeat__sub, .ed-pagefeat__title")].map((n) => n.textContent.trim());
      const seen = new Set();
      for (const l of lines) {
        if (l.length < 12) continue;
        if (seen.has(l)) out.push(`line set twice on one page: ${l.slice(0, 48)}…`);
        seen.add(l);
      }
    }
    for (const el of pages.querySelectorAll(".ed-pagefeat__text, .ed-pagefeat__title, .ed-pagefeat__row")) {
      const r = el.getBoundingClientRect();
      if (r.right > box.right + 1 || r.left < box.left - 1) out.push(`past the column: ${el.className}`);
    }
    // a picture drawn smaller than a thumbnail has nothing to do with its neighbours
    for (const img of pages.querySelectorAll(".ed-pagefeat__plate img")) {
      const r = img.getBoundingClientRect();
      // a printed banner is short because it is a banner, not because it was squeezed
      const banner = r.width / r.height > 4;
      if (r.width < 60 || (r.height < 60 && !banner)) out.push(`picture drawn ${Math.round(r.width)}×${Math.round(r.height)}: ${img.getAttribute("src").split("?")[0].slice(-28)}`);
    }
    // rows are justified: pictures standing on one line share a height
    // (on a narrow screen a row wraps, and each line is measured on its own)
    for (const row of pages.querySelectorAll(".ed-pagefeat__row")) {
      const lines = new Map();
      for (const img of row.querySelectorAll("img")) {
        const r = img.getBoundingClientRect();
        const top = Math.round(r.top);
        if (!lines.has(top)) lines.set(top, []);
        lines.get(top).push(Math.round(r.height));
      }
      for (const hs of lines.values())
        if (hs.length > 1 && Math.max(...hs) - Math.min(...hs) > 2) out.push(`row heights differ: ${hs.join(", ")}`);
    }
    return out;
  });
  if (found.length) faults.push([p, found]);
}

await browser.close();
console.log(`${paths.length} articles checked at ${width}px — ${faults.length} with faults`);
for (const [p, found] of faults) {
  console.log(`\n${p}`);
  for (const f of found.slice(0, 6)) console.log(`   ${f}`);
  if (found.length > 6) console.log(`   …and ${found.length - 6} more`);
}
