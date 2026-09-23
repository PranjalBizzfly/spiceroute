// Every picture set after an article, checked as the browser actually draws it:
// that the file loads at all, and that what it draws is not one flat colour
// (a blank plate on the page). Usage (from .qa/): node extras-blank-check.mjs <base> [width]
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const width = Number(process.argv[3] ?? 1280);
const paths = fs.readFileSync("tmp/extras-urls.txt", "utf8").split(/\r?\n/).filter(Boolean);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
const page = await ctx.newPage();
let checked = 0;
const bad = [];

for (const p of paths) {
  for (let go = 0; ; go++) {
    try { await page.goto(BASE + p, { waitUntil: "domcontentloaded" }); break; }
    catch (e) { if (go > 2) throw e; await page.waitForTimeout(700); }
  }
  await page.waitForTimeout(150);
  if (!(await page.locator(".ed-pages").count())) continue;
  const found = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll(".ed-pagefeat__plate img")];
    for (const img of imgs) { img.loading = "eager"; img.scrollIntoView(); }
    await new Promise((r) => setTimeout(r, 300));
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    const out = [];
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const cx = c.getContext("2d", { willReadFrequently: true });
    for (const img of imgs) {
      const src = (img.currentSrc || img.src).replace(/.*url=/, "").split("&")[0];
      if (!img.naturalWidth) { out.push(["did not load", src]); continue; }
      cx.fillStyle = "#fff";
      cx.fillRect(0, 0, 24, 24);
      cx.drawImage(img, 0, 0, 24, 24);
      const { data } = cx.getImageData(0, 0, 24, 24);
      let lo = 255, hi = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo < 10) out.push([`draws one flat colour (${lo}–${hi})`, src]);
    }
    return [imgs.length, out];
  });
  checked += found[0];
  for (const [why, src] of found[1]) bad.push([p, why, decodeURIComponent(src)]);
}

await browser.close();
console.log(`${checked} pictures drawn across ${paths.length} articles — ${bad.length} blank or missing`);
for (const [p, why, src] of bad) console.log(`  ${p}\n     ${why}: ${src}`);
