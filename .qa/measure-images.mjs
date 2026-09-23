// For every image on every page, records the largest size it is ever DISPLAYED
// at (CSS px) across the given widths, plus where it appears, its alt text and
// object-fit. Joined with the file's true pixel size, this says which images
// are actually rendered soft.
// Usage (from .qa/): PLAYWRIGHT_BROWSERS_PATH=./browsers node measure-images.mjs [baseUrl] [widths]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const WIDTHS = (process.argv[3] ?? "390,768,1280,1920").split(",").map(Number);
const CONCURRENCY = 4;

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
routes.push("/search", "/search?q=kolkata", "/this-page-does-not-exist");

const probe = () => {
  const dec = (s) => decodeURIComponent(s).replace(/^.*[?&]url=/, "").split("&")[0];
  const out = [];
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    if (cs.display === "none" || cs.visibility === "hidden" || r.width < 2) continue;
    const card = img.closest("article, li, a, figure, section");
    out.push({
      src: dec(img.currentSrc || img.src),
      w: Math.round(r.width), h: Math.round(r.height),
      nw: img.naturalWidth, nh: img.naturalHeight,
      fit: cs.objectFit,
      alt: img.getAttribute("alt"),
      near: (card?.querySelector("h1,h2,h3,h4,figcaption")?.innerText || "").trim().replace(/\s+/g, " ").slice(0, 60),
    });
  }
  return out;
};

const jobs = [];
for (const r of routes) for (const w of WIDTHS) jobs.push([r, w]);
const byFile = new Map();
const browser = await chromium.launch();
let done = 0;

async function worker() {
  const ctxs = new Map();
  while (jobs.length) {
    const [route, w] = jobs.shift();
    if (!ctxs.has(w)) ctxs.set(w, await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" }));
    const page = await ctxs.get(w).newPage();
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
      await page.evaluate(async () => {
        const step = Math.max(300, innerHeight * 0.7);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo({ top: y, behavior: "instant" });
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      for (const i of await page.evaluate(probe)) {
        const cur = byFile.get(i.src) ?? { src: i.src, maxW: 0, maxH: 0, atWidth: 0, fit: i.fit, alt: i.alt, near: i.near, routes: new Set() };
        cur.routes.add(route);
        if (i.w > cur.maxW) { cur.maxW = i.w; cur.maxH = i.h; cur.atWidth = w; cur.fit = i.fit; cur.near = i.near || cur.near; }
        if (i.alt != null) cur.alt = i.alt;
        byFile.set(i.src, cur);
      }
    } catch (e) {
      console.log("FAIL", route, w, String(e).slice(0, 80));
    }
    await page.close();
    if (++done % 100 === 0) console.log(`${done}/${done + jobs.length} loads`);
  }
  for (const c of ctxs.values()) await c.close();
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();

const rows = [...byFile.values()].map((r) => ({ ...r, routes: [...r.routes].slice(0, 4), routeCount: r.routes.size }));
await fs.mkdir("screenshots", { recursive: true });
await fs.writeFile("screenshots/img-displayed.json", JSON.stringify(rows, null, 1));
console.log("distinct images rendered:", rows.length);
