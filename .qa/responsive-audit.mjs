// Full image / alt / responsive audit (Chromium via Playwright).
// Every sitemap route at the eight target widths, plus intermediate widths on
// one page of each template. Writes screenshots/audit/report.json.
// Usage (from .qa/): node responsive-audit.mjs [baseUrl] [--only=/path]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const TARGET_WIDTHS = process.argv.find((a) => a.startsWith("--widths="))?.slice(9).split(",").map(Number) ?? [320, 375, 414, 768, 1024, 1280, 1440, 1920];
const EXTRA_WIDTHS = [340, 360, 390, 480, 540, 600, 700, 820, 900, 959, 961, 1100, 1180, 1366, 1600, 2560];
const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "screenshots/audit";
const CONCURRENCY = 4;

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
routes.push("/this-page-does-not-exist", "/search", "/search?q=kolkata", "/search?category=travel-escapes", "/search?q=zzqxv");
const reps = [
  "/", "/about", "/contact", "/inflight-magazine", "/this-page-does-not-exist",
  routes.find((r) => /^\/inflight-magazine\/.+/.test(r)),
  ...routes.filter((r) => r.startsWith("/stories/")).slice(0, 3),
];

// ---------- in-page probe ----------
const probe = () => {
  const vw = document.documentElement.clientWidth;
  // also skips screen-reader-only text (the 1px clipped pattern), wherever it is declared
  const srOnly = (el) => el.clientWidth <= 1 && el.clientHeight <= 1 && getComputedStyle(el).position === "absolute";
  const ignore = (el) => el.closest("nextjs-portal, [data-nextjs-toast], .visually-hidden, .ed-issue__ambient, [aria-hidden='true'] svg") || srOnly(el);
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.01 && el.getClientRects().length > 0;
  };
  const describe = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const txt = (el.innerText || el.getAttribute("alt") || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${txt ? ` "${txt}"` : ""}`;
  };
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) {
        const r = p.getBoundingClientRect();
        if (r.left >= -1 && r.right <= vw + 1) return true;
      }
      if (cs.position === "fixed" && cs.transform !== "none") return true; // off-canvas drawer
    }
    return false;
  };

  // Inside a closed <details>, or clipped away entirely by an overflow ancestor
  const collapsed = (el, r) => {
    const d = el.closest("details:not([open])");
    if (d && !el.closest("summary")) return true;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowY === "visible") continue;
      const pr = p.getBoundingClientRect();
      if (r.bottom <= pr.top + 1 || r.top >= pr.bottom - 1) return true;
    }
    return false;
  };
  const overflow = [], textOverflow = [], clipped = [], smallInputs = [], tinyTargets = [];
  const textLeaves = [];
  for (const el of document.querySelectorAll("body *")) {
    if (ignore(el) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(el);
    if ((r.right > vw + 1 || r.left < -1) && cs.position !== "fixed" && !clippedByAncestor(el)) overflow.push(`${describe(el)} [${Math.round(r.left)}→${Math.round(r.right)}]`);
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (ownText && cs.display !== "inline" && el.clientWidth > 0) {
      if (cs.overflowX === "visible" && el.scrollWidth > el.clientWidth + 2) textOverflow.push(`${describe(el)} [${el.scrollWidth}>${el.clientWidth}]`);
      if (cs.overflowX !== "visible" && cs.textOverflow !== "ellipsis" && !cs.webkitLineClamp?.match(/\d/) && el.scrollWidth > el.clientWidth + 2) clipped.push(`${describe(el)} [${el.scrollWidth}>${el.clientWidth}]`);
      if (cs.overflowY === "hidden" && cs.webkitLineClamp === "none" && el.scrollHeight > el.clientHeight + 3) clipped.push(`${describe(el)} [h ${el.scrollHeight}>${el.clientHeight}]`);
    }
    if (ownText && cs.display !== "inline" && !collapsed(el, r)) textLeaves.push([el, r]);
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== "hidden" && el.type !== "checkbox" && vw < 768 && parseFloat(cs.fontSize) < 16) smallInputs.push(`${describe(el)} ${cs.fontSize}`);
    if ((el.tagName === "BUTTON" || (el.tagName === "A" && !el.closest("p, li.ed-inline, .ed-article p"))) && vw < 1024 && (r.height < 24 || r.width < 24) && cs.display !== "inline") tinyTargets.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // Colliding text: two unrelated text blocks whose boxes intersect
  const overlaps = [];
  for (let i = 0; i < textLeaves.length && overlaps.length < 10; i++) {
    const [a, ra] = textLeaves[i];
    for (let j = i + 1; j < textLeaves.length; j++) {
      const [b, rb] = textLeaves[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 4 && iy > 4) overlaps.push(`${describe(a)} × ${describe(b)} (${Math.round(ix)}x${Math.round(iy)})`);
    }
  }

  const images = [...document.images].filter((img) => !ignore(img));
  const decode = (s) => decodeURIComponent(s).replace(/^.*[?&]url=/, "").split("&")[0];
  const imgRows = images.map((img) => {
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    const nat = img.naturalWidth / (img.naturalHeight || 1);
    const box = r.width / (r.height || 1);
    return { img, src: decode(img.currentSrc || img.src), vis: visible(img) && r.width > 0, w: r.width, h: r.height, nat, box, fit: cs.objectFit };
  });

  return {
    vw,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: overflow.slice(0, 12), overflowCount: overflow.length,
    textOverflow: textOverflow.slice(0, 8), clipped: clipped.slice(0, 8), overlaps,
    smallInputs, tinyTargets: tinyTargets.slice(0, 8),
    images: images.length,
    missingAlt: imgRows.filter((i) => !i.img.hasAttribute("alt")).map((i) => i.src),
    brokenImages: imgRows.filter((i) => i.img.complete && i.img.naturalWidth === 0 && i.img.getAttribute("loading") !== "lazy").map((i) => i.src),
    nonWebp: [...new Set(imgRows.filter((i) => /^\/images\/.*\.(jpe?g|png)$/i.test(i.src) && !/logo\.png$/.test(i.src)).map((i) => i.src))],
    remoteImages: [...new Set(imgRows.filter((i) => /^https?:/.test(i.src)).map((i) => i.src))],
    distorted: imgRows.filter((i) => i.vis && i.img.naturalWidth && (i.fit === "fill" || i.fit === "") && Math.abs(i.box - i.nat) / i.nat > 0.03).map((i) => `${i.src} box ${Math.round(i.w)}x${Math.round(i.h)} nat ${i.img.naturalWidth}x${i.img.naturalHeight}`),
    // srcset makes naturalWidth density-adjusted, so pass the box and compare with the file itself
    shown: imgRows.filter((i) => i.vis && i.src.startsWith("/images/")).map((i) => [i.src, Math.round(Math.max(i.w, i.h * i.nat))]),
  };
};

async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
}

const jobs = [];
for (const r of routes) if (!ONLY || r === ONLY) for (const w of TARGET_WIDTHS) jobs.push([r, w]);
for (const r of reps) if (!ONLY || r === ONLY) for (const w of EXTRA_WIDTHS) jobs.push([r, w]);

await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
let done = 0;
async function worker() {
  const ctxs = new Map();
  while (jobs.length) {
    const [route, w] = jobs.shift();
    if (!ctxs.has(w)) ctxs.set(w, await browser.newContext({ viewport: { width: w, height: w < 768 ? 800 : 900 }, reducedMotion: "reduce" }));
    const page = await ctxs.get(w).newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 120)}`));
    page.on("response", (res) => res.status() >= 400 && !res.url().includes("does-not-exist") && errors.push(`HTTP ${res.status()} ${res.url().slice(0, 120)}`));
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
      await settle(page);
      const p = await page.evaluate(probe);
      results.push({ route, w, errors, ...p });
      const bad = p.scrollWidth > p.vw || p.overflowCount || p.overlaps.length || p.textOverflow.length || p.clipped.length;
      if (bad && !ONLY) await page.screenshot({ path: `${OUT}/${w}${route.replace(/\//g, "_") || "_home"}.png`, fullPage: true });
    } catch (e) {
      results.push({ route, w, fatal: e.message.slice(0, 200) });
    }
    await page.close();
    if (++done % 50 === 0) console.log(`${done} pages`);
  }
  for (const c of ctxs.values()) await c.close();
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
const require = (await import("node:module")).createRequire(import.meta.url);
const sharp = require("../node_modules/sharp");
const fileW = new Map();
for (const r of results) {
  r.upscaled = [];
  for (const [src, shown] of r.shown ?? []) {
    if (!fileW.has(src)) fileW.set(src, (await sharp(`../public${src}`).metadata().catch(() => ({}))).width);
    const w = fileW.get(src);
    if (w && shown > w * 1.6 && shown > 200) r.upscaled.push(`${src} shown ${shown} > file ${w}`);
  }
  delete r.shown;
}
await fs.writeFile(`${OUT}/report.json`, JSON.stringify(results, null, 1));

// ---------- summary: group each problem by message across routes/widths ----------
const groups = new Map();
const add = (kind, msg, route, w) => {
  const key = `${kind}: ${msg}`;
  if (!groups.has(key)) groups.set(key, { routes: new Set(), widths: new Set() });
  groups.get(key).routes.add(route);
  groups.get(key).widths.add(w);
};
for (const r of results) {
  if (r.fatal) { add("fatal", r.fatal, r.route, r.w); continue; }
  if (r.scrollWidth > r.vw) add("page-hscroll", `${r.scrollWidth}>${r.vw}`, r.route, r.w);
  for (const k of ["overflow", "textOverflow", "clipped", "overlaps", "smallInputs", "tinyTargets", "missingAlt", "brokenImages", "nonWebp", "remoteImages", "distorted", "upscaled", "errors"])
    for (const m of r[k] ?? []) add(k, m.replace(/\[-?\d+→-?\d+\]|\d+>\d+|\(\d+x\d+\)|\d+x\d+$/g, "#"), r.route, r.w);
}
const summary = [...groups].map(([k, v]) => ({ issue: k, pages: v.routes.size, widths: [...v.widths].sort((a, b) => a - b).join(","), example: [...v.routes][0] }))
  .sort((a, b) => b.pages - a.pages);
await fs.writeFile(`${OUT}/summary.json`, JSON.stringify(summary, null, 1));
console.log(`${results.length} page loads, ${results.filter((r) => r.fatal).length} failed, ${summary.length} distinct issues`);
for (const s of summary.slice(0, 80)) console.log(`[${s.pages}p @${s.widths}] ${s.issue.slice(0, 170)}  e.g. ${s.example}`);
