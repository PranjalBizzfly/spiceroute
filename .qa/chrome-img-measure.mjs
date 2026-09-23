// Measures covers, site artwork and logos as they are really shown, ignoring
// the deliberately blurred ambient backdrop behind edition heroes.
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node chrome-img-measure.mjs [baseUrl]
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const ROUTES = ["/", "/about", "/contact", "/inflight-magazine", "/inflight-magazine/september-2026", "/inflight-magazine/may-2026", "/stories/travel-escapes", "/search?q=kolkata"];
const WIDTHS = [390, 768, 1280, 1920, 2560];

const probe = () => {
  const dec = (s) => decodeURIComponent(s).replace(/^.*[?&]url=/, "").split("&")[0];
  const out = [];
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (r.width < 2) continue;
    out.push({
      src: dec(img.currentSrc || img.src),
      w: Math.round(r.width),
      ambient: !!img.closest(".ed-issue__ambient"),
      decorative: img.getAttribute("alt") === "" || !!img.closest("[aria-hidden='true']"),
    });
  }
  return out;
};

const best = new Map();
const browser = await chromium.launch();
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      });
      await page.waitForTimeout(300);
      for (const i of await page.evaluate(probe)) {
        if (!/^\/images\/(covers|hero)\//.test(i.src) && !/^\/images\/[a-z-]+\.(webp|png)$/.test(i.src)) continue;
        const cur = best.get(i.src) ?? { src: i.src, real: 0, ambient: 0, decorative: i.decorative };
        if (i.ambient) cur.ambient = Math.max(cur.ambient, i.w);
        else cur.real = Math.max(cur.real, i.w);
        best.set(i.src, cur);
      }
    } catch (e) { console.log("FAIL", route, w, String(e).slice(0, 60)); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

const inv = JSON.parse(fs.readFileSync("screenshots/img-source-check.json", "utf8"));
const byF = new Map(inv.map((r) => [r.f, r]));
const rows = [...best.values()].map((b) => {
  const i = byF.get(b.src);
  return { ...b, w: i?.w, h: i?.h, kb: i?.kb, ratio: i && b.real ? +(i.w / b.real).toFixed(2) : null };
}).sort((a, b) => (a.ratio ?? 99) - (b.ratio ?? 99));
fs.writeFileSync("screenshots/chrome-img.json", JSON.stringify(rows, null, 1));
for (const r of rows)
  console.log(`${String(r.ratio ?? "-").padStart(5)}  file ${r.w}x${r.h} ${String(r.kb).padStart(4)}kB  shown ${String(r.real).padStart(4)}  ambient ${String(r.ambient).padStart(4)}  ${r.src}`);
