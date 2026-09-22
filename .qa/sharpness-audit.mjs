// Sharpness audit: every visible <img> on every sitemap route, displayed CSS
// width vs the source file's pixel width. An image shown wider than its file
// is upscaled (soft). Grouped by component so fixes can target the container.
// Writes tmp/sharpness-audit.json. Usage (from .qa/): node sharpness-audit.mjs [baseUrl] [widths]
import fs from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");
const BASE = process.argv[2] ?? "http://localhost:3001";
const WIDTHS = (process.argv[3] ?? "375,768,1440,1920").split(",").map(Number);

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || "/");

const fileW = new Map();
const widthOf = async (src) => {
  if (!fileW.has(src)) fileW.set(src, (await sharp(`../public${src}`).metadata().catch(() => ({}))).width ?? null);
  return fileW.get(src);
};

const browser = await chromium.launch();
const hits = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  const queue = [...routes];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      const page = await ctx.newPage();
      while (queue.length) {
        const route = queue.shift();
        try {
          await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
          await page.evaluate(async () => {
            for (let y = 0; y < document.documentElement.scrollHeight; y += 800) {
              scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 30));
            }
          });
          const imgs = await page.evaluate(() =>
            [...document.images]
              .filter((i) => {
                const r = i.getBoundingClientRect();
                const cs = getComputedStyle(i);
                return r.width > 40 && cs.visibility !== "hidden" && cs.display !== "none" && !i.closest("[aria-hidden='true']") && !/backdrop|ambient/.test(i.className);
              })
              .map((i) => {
                let src = i.currentSrc || i.src;
                try {
                  const u = new URL(src, location.href);
                  src = u.searchParams.get("url") ?? u.pathname;
                } catch {}
                const r = i.getBoundingClientRect();
                const cs = getComputedStyle(i);
                // object-fit: cover scales to fill the box; contain fits inside it
                return { src: decodeURIComponent(src), bw: r.width, bh: r.height, fit: cs.objectFit, box: (i.closest("[class]")?.className || "").toString().split(" ")[0] };
              }),
          );
          for (const im of imgs) {
            if (!im.src.startsWith("/images/")) continue;
            const fw = await widthOf(im.src);
            if (!fw) continue;
            const meta = await sharp(`../public${im.src}`).metadata();
            const ratio = meta.width / meta.height;
            // CSS pixels the file is actually stretched across
            const shownW = im.fit === "cover" ? Math.max(im.bw, im.bh * ratio) : im.fit === "contain" ? Math.min(im.bw, im.bh * ratio) : im.bw;
            const scale = shownW / fw;
            if (scale > 1.05) hits.push({ w, route, src: im.src, box: im.box, fileW: fw, shown: Math.round(shownW), scale: +scale.toFixed(2) });
          }
        } catch (e) {
          console.log("fail", w, route, e.message.slice(0, 60));
        }
      }
      await page.close();
    }),
  );
  await ctx.close();
  console.log("width", w, "done");
}
await browser.close();
fs.writeFileSync("tmp/sharpness-audit.json", JSON.stringify(hits, null, 1));

const byBox = {};
for (const h of hits) {
  const k = h.box;
  byBox[k] ??= { count: 0, images: new Set(), worst: 0, example: "" };
  byBox[k].count++;
  byBox[k].images.add(h.src);
  if (h.scale > byBox[k].worst) {
    byBox[k].worst = h.scale;
    byBox[k].example = `${h.route} @${h.w} ${h.src.split("/").pop()} ${h.fileW}px shown ${h.shown}px`;
  }
}
console.log(`upscaled renders: ${hits.length}, unique images: ${new Set(hits.map((h) => h.src)).size}`);
for (const [k, v] of Object.entries(byBox).sort((a, b) => b[1].count - a[1].count))
  console.log(`${k.padEnd(26)} renders ${String(v.count).padStart(5)}  images ${String(v.images.size).padStart(4)}  worst ${v.worst}x  e.g. ${v.example}`);
