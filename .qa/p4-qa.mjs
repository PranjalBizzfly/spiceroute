// Prompt 4 browser QA (Chromium via Playwright) against the production build.
// Per page × width: console/page errors, failed HTTP requests, broken images,
// horizontal overflow, cumulative layout shift, text-on-text overlap, image
// crop/upscale report, sticky header. Plus interaction checks: mobile nav,
// PDF viewer layering, anchor under sticky header, keyboard, reduced motion.
// Usage: node p4-qa.mjs [baseUrl]
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const sharp = createRequire(import.meta.url)("../node_modules/sharp");
const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3123";
const OUT = `screenshots/p4qa-${process.env.THEME ?? "light"}`;
if (!process.argv.includes("--interactions-only")) await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const WIDTHS = [
  [320, 740], [360, 780], [390, 844], [430, 932], [768, 1024],
  [820, 1180], [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
];
const PAGES = [
  "/",
  "/inflight-magazine",
  "/inflight-magazine/september-2026",
  "/inflight-magazine/august-2026",
  "/inflight-magazine/april-2025",
  "/inflight-magazine/february-2024",
  // + the article reached by clicking from the September edition (added below)
  "/stories/destinations/ladakh-roof-of-the-world",
  "/stories/interviews/ranveer-brar-conversation",
  "/about",
  "/contact",
];

// Original pixel widths of local images (for the upscale report)
const natural = new Map();
for (const dir of ["stories", "covers"]) {
  // gallery photographs live in one folder per story
  for (const f of await fs.readdir(`../public/images/${dir}`, { recursive: true })) {
    if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
    const rel = f.split("\\").join("/");
    const m = await sharp(`../public/images/${dir}/${rel}`).metadata();
    natural.set(`/images/${dir}/${rel}`, { w: m.width, h: m.height });
  }
}

const results = [];
const issues = [];
const note = (area, page, width, detail) => issues.push({ area, page, width, detail });

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// 0. Click through from an edition page to an article
// ---------------------------------------------------------------------------
let clickedArticle;
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/inflight-magazine/september-2026", { waitUntil: "networkidle" });
  await page.locator(".ed-toc__link", { hasText: "Forever Kolkata" }).click();
  await page.waitForURL(/\/stories\//);
  clickedArticle = new URL(page.url()).pathname;
  const h1 = await page.locator("h1").innerText();
  results.push({ check: "click-through", ok: clickedArticle === "/stories/travel/kolkata-forever-day-in-a-city" && /Forever Kolkata/.test(h1), detail: `${clickedArticle} — h1 "${h1}"` });
  await ctx.close();
}
PAGES.splice(6, 0, clickedArticle);

// ---------------------------------------------------------------------------
// 1. Page × width sweep
// ---------------------------------------------------------------------------
const probe = ({ natural }) => {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: null, broken: [], overlaps: [], crops: [], upscales: [], h1: 0, skips: [] };

  // horizontal overflow
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) out.overflow = `${sw} > ${vw}`;

  // broken images
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (!img.complete || img.naturalWidth === 0) out.broken.push(img.getAttribute("src")?.slice(0, 90));
    // crop / upscale on visible, sizeable images
    if (r.width < 40 || r.height < 40 || !img.complete || !img.naturalWidth || !img.currentSrc) continue;
    if (img.closest(".ed-issue__ambient")) continue;
    const cs = getComputedStyle(img);
    const src = decodeURIComponent(img.currentSrc).match(/url=([^&]+)/)?.[1] ?? new URL(img.currentSrc).pathname;
    const nat = natural[src];
    if (!nat) continue;
    const boxRatio = r.width / r.height;
    const natRatio = nat.w / nat.h;
    const shown = cs.objectFit === "cover" ? Math.min(boxRatio / natRatio, natRatio / boxRatio) : 1;
    if (shown < 0.5) out.crops.push(`${src.split("/").pop()} shows ${(shown * 100).toFixed(0)}% (${Math.round(r.width)}×${Math.round(r.height)})`);
    // CSS px needed from the source at DPR 1 (width after cover-crop)
    const needW = cs.objectFit === "cover" && boxRatio < natRatio ? r.height * natRatio : r.width;
    if (needW > nat.w * 1.15) out.upscales.push(`${src.split("/").pop()} ${Math.round(needW)}px from ${nat.w}px`);
  }

  // headings
  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => h.getClientRects().length && !h.closest("[hidden]"));
  out.h1 = hs.filter((h) => h.tagName === "H1").length;
  let prev = 0;
  for (const h of hs) {
    const lvl = Number(h.tagName[1]);
    if (prev && lvl > prev + 1) out.skips.push(`${h.tagName} after H${prev}: "${h.textContent.trim().slice(0, 40)}"`);
    prev = lvl;
  }

  // text-on-text overlap: rectangles of rendered text runs
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest("[hidden], .visually-hidden, script, style, noscript, [aria-hidden='true']")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const clips = [];
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.overflowX !== "visible" || pcs.overflowY !== "visible") clips.push(p.getBoundingClientRect());
    }
    for (const raw of range.getClientRects()) {
      let r = { left: raw.left, top: raw.top, right: raw.right, bottom: raw.bottom };
      for (const c of clips) r = { left: Math.max(r.left, c.left), top: Math.max(r.top, c.top), right: Math.min(r.right, c.right), bottom: Math.min(r.bottom, c.bottom) };
      r.width = r.right - r.left;
      r.height = r.bottom - r.top;
      if (r.width < 2 || r.height < 2) continue;
      runs.push({ el, r: { l: r.left, t: r.top + window.scrollY, rr: r.right, b: r.bottom + window.scrollY }, txt: n.textContent.trim().slice(0, 30) });
    }
  }
  runs.sort((a, b) => a.r.t - b.r.t);
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length && runs[j].r.t < runs[i].r.b; j++) {
      const a = runs[i], b = runs[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.rr, b.r.rr) - Math.max(a.r.l, b.r.l);
      const h = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
      // allow the line-box overlap of adjacent inline runs
      if (w > 3 && h > 4) out.overlaps.push(`"${a.txt}" × "${b.txt}" (${Math.round(w)}×${Math.round(h)})`);
    }
  }
  return out;
};

const SWEEP = !process.argv.includes("--interactions-only");
for (const [w, h] of SWEEP ? WIDTHS : []) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: process.env.THEME ?? "light" });
  await ctx.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    const failed = [];
    const pdfRequests = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 110)}`); });
    page.on("requestfailed", (r) => { if (!/_rsc=|\/_next\/.*prefetch/.test(r.url())) failed.push(`FAILED ${r.failure()?.errorText} ${r.url().slice(0, 110)}`); });
    page.on("request", (r) => { if (/\.pdf(\?|$)/i.test(r.url())) pdfRequests.push(r.url()); });

    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    const tag = `${path === "/" ? "home" : path.slice(1).replace(/\//g, "_")}-${w}`;
    await page.screenshot({ path: `${OUT}/${tag}-top.jpg`, type: "jpeg", quality: 70 });

    // scroll the whole page so lazy images load and reveals run
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += Math.round(innerHeight * 0.7)) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
    });
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))));
    await page.waitForTimeout(900);

    // sticky header: bar pinned to the top after scrolling
    const bar = await page.evaluate(() => document.querySelector(".ed-header__bar")?.getBoundingClientRect().top ?? null);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    const data = await page.evaluate(probe, { natural: Object.fromEntries(natural) });
    const cls = await page.evaluate(() => window.__cls);

    const row = { path, w, errors, failed, cls: Number(cls.toFixed(4)), barTop: bar, pdfAutoLoaded: pdfRequests.length, ...data };
    results.push({ check: "sweep", ...row });
    if (errors.length) note("console", path, w, errors.join(" | "));
    if (failed.length) note("http", path, w, failed.join(" | "));
    if (data.overflow) note("overflow", path, w, data.overflow);
    if (data.broken.length) note("images", path, w, `broken: ${data.broken.join(", ")}`);
    if (cls > 0.05) note("cls", path, w, `CLS ${cls.toFixed(3)}`);
    if (data.overlaps.length) note("overlap", path, w, data.overlaps.slice(0, 4).join(" ; "));
    if (data.h1 !== 1) note("headings", path, w, `h1 count ${data.h1}`);
    if (Math.abs(bar) > 1) note("sticky", path, w, `header bar top ${bar} after scroll`);
    if (pdfRequests.length) note("pdf", path, w, `PDF requested without user action: ${pdfRequests[0]}`);
    await page.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2. Interactions
// ---------------------------------------------------------------------------
async function withPage(w, h, opts, fn) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...opts });
  const page = await ctx.newPage();
  try { return await fn(page); } finally { await ctx.close(); }
}

// Mobile navigation
for (const [w, h] of [[320, 740], [390, 844], [768, 1024]]) {
  const r = await withPage(w, h, {}, async (page) => {
    await page.goto(BASE + "/inflight-magazine/september-2026", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 900));
    const toggle = page.locator(".ed-header__toggle");
    await toggle.click();
    const open = await page.evaluate(() => {
      const d = document.getElementById("mobile-navigation");
      const r = d.getBoundingClientRect();
      const link = d.querySelector(".ed-drawer__link");
      const lr = link.getBoundingClientRect();
      const hit = document.elementFromPoint(lr.left + 10, lr.top + lr.height / 2);
      const foot = d.querySelector(".ed-drawer__foot").getBoundingClientRect();
      return { visible: !d.hidden && r.height > 100, linkOnTop: d.contains(hit), bottomFits: foot.bottom <= innerHeight + 1, scrollLocked: getComputedStyle(document.body).overflow === "hidden", expanded: document.querySelector(".ed-header__toggle").getAttribute("aria-expanded") };
    });
    await page.keyboard.press("Escape");
    const closed = await page.evaluate(() => document.getElementById("mobile-navigation").hidden && getComputedStyle(document.body).overflow !== "hidden");
    await toggle.click();
    await page.locator(".ed-drawer__link", { hasText: "Inflight Magazine" }).click();
    await page.waitForURL(/\/inflight-magazine$/);
    const closedAfterNav = await page.evaluate(() => document.getElementById("mobile-navigation").hidden);
    return { ...open, escapeCloses: closed, closedAfterNav };
  });
  const ok = r.visible && r.linkOnTop && r.bottomFits && r.scrollLocked && r.expanded === "true" && r.escapeCloses && r.closedAfterNav;
  results.push({ check: "mobile-nav", w, ok, detail: r });
  if (!ok) note("mobile-nav", "/inflight-magazine/september-2026", w, JSON.stringify(r));
}

// PDF viewer layering + no PDF before the click + focus return
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const path of ["/inflight-magazine/september-2026", "/inflight-magazine/april-2025"]) {
    const r = await withPage(w, h, {}, async (page) => {
      const pdf = [];
      page.on("request", (q) => { if (/\.pdf(\?|$)/i.test(q.url())) pdf.push(q.url()); });
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      const before = pdf.length;
      const btn = page.locator(".ed-issue__hero").getByRole("button").first();
      const label = (await btn.innerText()).trim();
      await btn.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible" });
      await page.waitForTimeout(400);
      const layer = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const pts = [[innerWidth / 2, 12], [innerWidth / 2, innerHeight / 2], [12, innerHeight - 12]];
        return pts.map(([x, y]) => d.contains(document.elementFromPoint(x, y)) || document.elementFromPoint(x, y) === d.parentElement);
      });
      const focusInside = await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement));
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      const focusBack = await page.evaluate(() => document.activeElement?.closest(".ed-issue__hero") !== null && document.activeElement?.tagName === "BUTTON");
      return { label, pdfBeforeClick: before, layer, focusInside, focusBack };
    });
    const ok = r.pdfBeforeClick === 0 && r.layer.every(Boolean) && r.focusInside && r.focusBack;
    results.push({ check: "pdf-viewer", w, path, ok, detail: r });
    if (!ok) note("pdf-viewer", path, w, JSON.stringify(r));
  }
}

// In-page anchor lands below the sticky header
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const r = await withPage(w, h, {}, async (page) => {
    await page.goto(BASE + "/inflight-magazine/september-2026", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /Read the stories/ }).click();
    await page.waitForTimeout(1200);
    return page.evaluate(() => {
      const header = document.querySelector(".ed-header").getBoundingClientRect();
      const t = document.getElementById("contents-title").getBoundingClientRect();
      return { headerBottom: Math.round(header.bottom), headingTop: Math.round(t.top), clear: t.top >= header.bottom };
    });
  });
  results.push({ check: "anchor", w, ok: r.clear, detail: r });
  if (!r.clear) note("anchor", "/inflight-magazine/september-2026", w, JSON.stringify(r));
}

// Keyboard: skip link first, focus always visible
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const path of ["/", "/inflight-magazine/september-2026", clickedArticle]) {
    const r = await withPage(w, h, {}, async (page) => {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.keyboard.press("Tab");
      const first = await page.evaluate(() => document.activeElement?.className ?? "");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      const inMain = await page.evaluate(() => Boolean(document.activeElement?.closest("main")));
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
      const invisible = [];
      // (the skip link slides in over 0.2s; measure once it has arrived)
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab");
        await page.waitForTimeout(260);
        const f = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const visible = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
          const hit = document.elementFromPoint(Math.min(Math.max(r.left + Math.min(r.width, 40) / 2, 1), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1));
          const uncovered = Boolean(hit && (el.contains(hit) || hit.contains(el)));
          return { visible, onScreen: r.bottom > 0 && r.top < innerHeight && r.width > 0 && uncovered, txt: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30) };
        });
        if (f && (!f.visible || !f.onScreen)) invisible.push(f);
      }
      return { first, inMain, invisible };
    });
    const ok = /skip-link/.test(r.first) && r.inMain && r.invisible.length === 0;
    results.push({ check: "keyboard", w, path, ok, detail: r });
    if (!ok) note("keyboard", path, w, JSON.stringify(r));
  }
}

// Reduced motion: nothing hidden, no entrance or drift animation
for (const [w, h] of [[390, 844], [1440, 900]]) {
  for (const path of ["/", "/inflight-magazine/september-2026", clickedArticle]) {
    const r = await withPage(w, h, { reducedMotion: "reduce" }, async (page) => {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
      return page.evaluate(() => ({
        armed: document.querySelectorAll("[data-armed]").length,
        hidden: [...document.querySelectorAll(".ed-reveal")].filter((e) => getComputedStyle(e).opacity !== "1").length,
        riseAnim: [...document.querySelectorAll(".ed-rise, .ed-cover-in")].filter((e) => getComputedStyle(e).animationName !== "none").length,
        drift: [...document.querySelectorAll(".ed-front__photo img")].filter((e) => getComputedStyle(e).animationName !== "none").length,
      }));
    });
    const ok = r.armed === 0 && r.hidden === 0 && r.riseAnim === 0 && r.drift === 0;
    results.push({ check: "reduced-motion", w, path, ok, detail: r });
    if (!ok) note("reduced-motion", path, w, JSON.stringify(r));
  }
}

// With motion allowed, the hero photo drifts (scroll-driven) and reveals arm
{
  const r = await withPage(1440, 900, {}, async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    return page.evaluate(() => ({
      drift: getComputedStyle(document.querySelector(".ed-front__photo img")).animationName,
      armed: document.querySelectorAll("[data-armed]").length,
    }));
  });
  results.push({ check: "motion-on", ok: r.armed > 0, detail: r });
}

await browser.close();
await fs.writeFile(`${OUT}/${SWEEP ? "p4-qa" : "p4-qa-interactions"}.json`, JSON.stringify({ results, issues }, null, 1));

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const sweep = results.filter((r) => r.check === "sweep");
console.log(`click-through: ${results[0].ok ? "PASS" : "FAIL"} ${results[0].detail}`);
console.log(`sweep: ${sweep.length} page×width loads (${PAGES.length} pages × ${WIDTHS.length} widths)`);
const maxCls = sweep.reduce((m, r) => Math.max(m, r.cls), 0);
console.log(`max CLS ${maxCls}`);
const crops = new Set(sweep.flatMap((r) => r.crops.map((c) => `${r.path}@${r.w}: ${c}`)));
const ups = new Set(sweep.flatMap((r) => r.upscales.map((c) => `${r.path}@${r.w}: ${c}`)));
const skips = new Set(sweep.flatMap((r) => r.skips.map((c) => `${r.path}: ${c}`)));
console.log(`info — heavy crops (<50% of image shown): ${crops.size}`);
for (const c of [...crops].slice(0, 12)) console.log("   " + c);
console.log(`info — images displayed >15% wider than their source: ${ups.size}`);
for (const c of [...ups].slice(0, 12)) console.log("   " + c);
console.log(`info — heading level skips: ${skips.size}`);
for (const c of [...skips].slice(0, 10)) console.log("   " + c);
for (const c of ["mobile-nav", "pdf-viewer", "anchor", "keyboard", "reduced-motion", "motion-on"]) {
  const rs = results.filter((r) => r.check === c);
  console.log(`${c}: ${rs.filter((r) => r.ok).length}/${rs.length} pass`);
}
console.log(issues.length ? `\n${issues.length} ISSUE(S):` : "\nNO ISSUES");
for (const i of issues.slice(0, 60)) console.log(`  [${i.area}] ${i.page} @${i.width}: ${i.detail}`);
