// Image-position audit over every page: broken or empty images, image slots
// rendered without an image (type plates, empty frames), heavy cover crops,
// distortion and upscaling. Usage (from .qa/): node image-audit.mjs [baseUrl] [width]
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");
const BASE = process.argv[2] ?? "http://localhost:3001";
const W = Number(process.argv[3] ?? 1280);

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
routes.push("/search", "/search?q=kolkata", "/this-page-does-not-exist"); // category pages come from the sitemap

const probe = () => {
  const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 2 && r.height > 2; };
  const where = (el) => {
    const sec = el.closest("section[aria-labelledby], section[aria-label], article, aside, header, footer, main");
    const lab = sec?.getAttribute("aria-label") || (sec?.getAttribute("aria-labelledby") && document.getElementById(sec.getAttribute("aria-labelledby"))?.innerText) || sec?.tagName.toLowerCase();
    const card = el.closest("article, li, a");
    const title = card?.querySelector("h2,h3,h4,.ed-card__title,.ed-gcard__title")?.innerText;
    return `${(lab || "").trim().slice(0, 40)}${title ? " › " + title.trim().slice(0, 50) : ""}`;
  };
  const decode = (s) => decodeURIComponent(s || "").replace(/^.*[?&]url=/, "").split("&")[0];
  const out = { images: 0, broken: [], emptySrc: [], noAlt: [], placeholders: [], emptyFrames: [], heavyCrop: [], distorted: [], shown: [] };
  for (const img of document.images) {
    if (img.closest(".ed-issue__ambient, [data-clone], nextjs-portal") || img.matches(".ed-photo__backdrop") || img.closest("ul[aria-hidden=\"true\"]")) continue;
    out.images++;
    const src = decode(img.currentSrc || img.getAttribute("src"));
    if (!img.getAttribute("src")) out.emptySrc.push(where(img));
    if (!img.hasAttribute("alt")) out.noAlt.push(src);
    if (!vis(img)) continue;
    if (img.complete && img.naturalWidth === 0) out.broken.push(`${src} @ ${where(img)}`);
    const r = img.getBoundingClientRect(), cs = getComputedStyle(img);
    const nat = img.naturalWidth / (img.naturalHeight || 1), box = r.width / r.height;
    if (img.naturalWidth && (cs.objectFit === "fill" || !cs.objectFit) && Math.abs(box - nat) / nat > 0.03) out.distorted.push(`${src} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (img.naturalWidth && cs.objectFit === "cover") { const shown = Math.min(box / nat, nat / box); if (shown < 0.4) out.heavyCrop.push(`${src} shows ${Math.round(shown * 100)}% @ ${where(img)}`); }
    if (src.startsWith("/images/")) out.shown.push([src, Math.round(cs.objectFit === "contain" ? Math.min(r.width, r.height * nat) : Math.max(r.width, r.height * nat)), where(img)]);
  }
  // image slots rendered without a photograph
  for (const el of document.querySelectorAll(".ed-card__plate--type, .ed-gcard--noimage, [class*='--noimage'], [class*='plate--type']")) {
    if (vis(el)) out.placeholders.push(`${el.className.split(" ").pop()} @ ${where(el)}`);
  }
  // frames meant to hold an image but empty
  for (const el of document.querySelectorAll("[class*='__plate'], [class*='__thumb'], [class*='__cover'], [class*='__media'], [class*='__photo'], [class*='__figure'], figure")) {
    if (!vis(el) || el.matches(".ed-card__plate--type, [class*='--noimage']") || el.closest("[data-clone]")) continue;
    const hasImg = el.querySelector("img, picture, svg, video, canvas") || getComputedStyle(el).backgroundImage !== "none";
    if (!hasImg && !el.innerText.trim()) out.emptyFrames.push(`${el.className || el.tagName} @ ${where(el)}`);
  }
  return out;
};

const browser = await chromium.launch();
const results = [];
const queue = [...routes];
async function worker() {
  const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, reducedMotion: "reduce" });
  while (queue.length) {
    const route = queue.shift();
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      results.push({ route, ...(await page.evaluate(probe)) });
    } catch (e) {
      results.push({ route, fatal: e.message.slice(0, 150) });
    }
    await page.close();
  }
  await ctx.close();
}
await Promise.all([worker(), worker(), worker(), worker()]);
await browser.close();

// upscaling against the real file width
const fileW = new Map();
for (const r of results) {
  r.upscaled = [];
  for (const [src, shown, at] of r.shown ?? []) {
    if (!fileW.has(src)) fileW.set(src, (await sharp(`../public${src}`).metadata().catch(() => ({}))).width);
    const w = fileW.get(src);
    if (w && shown > w * 1.6 && shown > 240) r.upscaled.push(`${src} ${shown}px from ${w}px @ ${at}`);
  }
  delete r.shown;
}
await fs.mkdir("tmp", { recursive: true });
await fs.writeFile(`tmp/image-audit-${W}.json`, JSON.stringify(results, null, 1));
const sum = (k) => results.reduce((n, r) => n + (r[k]?.length ?? 0), 0);
console.log(`${results.length} pages @${W}px, ${results.reduce((n, r) => n + (r.images ?? 0), 0)} images`);
for (const k of ["broken", "emptySrc", "noAlt", "placeholders", "emptyFrames", "distorted", "heavyCrop", "upscaled"]) console.log(`${k}: ${sum(k)}`);
console.log("fatal:", results.filter((r) => r.fatal).map((r) => r.route + " " + r.fatal));
