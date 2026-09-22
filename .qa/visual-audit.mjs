// Strict visual/layout audit of every route. Measures, per page and width:
//   overflow     page wider than the viewport
//   edge         text within 12px of the viewport edge (outside scroll rails)
//   tiny         text under 12px
//   measure      text lines longer than ~95 characters (hard to read)
//   rowtops      cards in one grid row whose tops, photos or titles differ
//   orphan       a lone card on the last row of a multi-column grid
//   crop         a photo shown far more cropped than its own shape allows
//   blur         a photo shown well beyond its own pixel size
//   overlap      sibling blocks that overlap
//   gap          an empty band taller than 60% of the screen between blocks
//   container    a section's content starting off the page grid
// Usage: PLAYWRIGHT_BROWSERS_PATH=./browsers node visual-audit.mjs [base] [widths] [pathFilter]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3140";
const WIDTHS = (process.argv[3] ?? "390,1024,1440").split(",").map(Number);
const FILTER = process.argv[4] ? new RegExp(process.argv[4]) : null;

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const paths = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))];
paths.push("/search", "/search?category=travel-escapes", "/search?q=kolkata", "/this-page-does-not-exist");
const routes = paths.filter((p) => !FILTER || FILTER.test(p));

const probe = () => {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const vh = innerHeight;
  const vis = (el) => {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const skip = (el) => el.closest("[hidden], .visually-hidden, [aria-hidden='true'], .ed-lightbox, dialog, .ed-drawer, .ed-hx__slide:not(.is-active), .ed-navmenu");
  const rail = (el) => el.closest(".ed-editions, .ed-triptych, .ed-shelf__track, .ed-hx__tabs");
  const name = (el) => {
    const c = typeof el.className === "string" ? el.className.split(/\s+/).find((x) => x.startsWith("ed-")) : "";
    return `${el.tagName.toLowerCase()}${c ? "." + c : ""}`;
  };
  const add = (type, el, msg) => issues.push({ type, el: el ? name(el) : "", msg });

  if (document.documentElement.scrollWidth > vw + 1) add("overflow", null, `scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);

  // Text nodes: edge, tiny, measure
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (seen.has(el)) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    if (!vis(el) || skip(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!rail(el) && (r.left < 12 || r.right > vw - 12) && r.width > 0 && cs.position !== "fixed") add("edge", el, `[${Math.round(r.left)}→${Math.round(r.right)}] "${el.textContent.trim().slice(0, 30)}"`);
    const fs = parseFloat(cs.fontSize);
    if (fs < 12 && el.textContent.trim().length > 2) add("tiny", el, `${fs}px "${el.textContent.trim().slice(0, 30)}"`);
    if (cs.display === "block" && /^(P|LI|BLOCKQUOTE|DD)$/.test(el.tagName) && el.textContent.length > 200) {
      const chars = r.width / (fs * 0.5);
      if (chars > 95) add("measure", el, `~${Math.round(chars)} chars/line`);
    }
  }

  // Grids / flex rows of cards
  for (const g of document.querySelectorAll("main *")) {
    const cs = getComputedStyle(g);
    if (!(cs.display === "grid" || (cs.display === "flex" && cs.flexDirection.startsWith("row") && cs.flexWrap === "wrap"))) continue;
    if (!vis(g) || skip(g) || rail(g)) continue;
    const kids = [...g.children].filter((k) => vis(k) && getComputedStyle(k).position !== "absolute");
    if (kids.length < 3) continue;
    const cardish = kids.filter((k) => k.querySelector("img, h2, h3, h4")).length;
    if (cardish < kids.length * 0.8) continue;
    // rows by top
    const rows = new Map();
    for (const k of kids) {
      const top = Math.round(k.getBoundingClientRect().top);
      const key = [...rows.keys()].find((t) => Math.abs(t - top) < 60) ?? top;
      rows.set(key, [...(rows.get(key) ?? []), k]);
    }
    const rowList = [...rows.values()];
    const cols = Math.max(...rowList.map((r) => r.length));
    for (const row of rowList) {
      if (row.length < 2) continue;
      const tops = row.map((k) => Math.round(k.getBoundingClientRect().top));
      if (Math.max(...tops) - Math.min(...tops) > 2) add("rowtops", g, `card tops differ ${tops.join(",")}`);
      const heads = row.map((k) => k.querySelector("h2, h3, h4")).filter(Boolean);
      if (heads.length === row.length) {
        const ht = heads.map((h) => Math.round(h.getBoundingClientRect().top));
        if (Math.max(...ht) - Math.min(...ht) > 3) add("rowtops", g, `titles differ ${ht.join(",")}`);
      }
      const imgs = row.map((k) => k.querySelector("img")).filter(Boolean);
      if (imgs.length === row.length) {
        const ih = imgs.map((i) => Math.round(i.getBoundingClientRect().height));
        if (Math.max(...ih) - Math.min(...ih) > 3) add("rowtops", g, `photo heights differ ${ih.join(",")}`);
      }
    }
    const last = rowList[rowList.length - 1];
    if (cols >= 3 && last.length === 1 && rowList.length > 1) add("orphan", g, `${kids.length} items in ${cols} columns leaves 1 alone`);
  }

  // Photos
  const fileOf = (img) => { const u = decodeURIComponent(img.currentSrc); return (u.match(/url=([^&]+)/)?.[1] ?? u).split("/").slice(-2).join("/"); };
  for (const img of document.querySelectorAll("main img, footer img")) {
    if (!vis(img) || skip(img) || !img.naturalWidth) continue;
    if (img.closest(".ed-issue__ambient") || img.classList.contains("ed-photo__backdrop")) continue; // decorative blur
    const r = img.getBoundingClientRect();
    if (r.width < 40) continue;
    const cs = getComputedStyle(img);
    const nat = img.naturalWidth / img.naturalHeight;
    const box = r.width / r.height;
    if (cs.objectFit === "cover") {
      const keep = nat > box ? box / nat : nat / box; // share of the photo kept
      if (keep < 0.45) add("crop", img, `keeps ${Math.round(keep * 100)}% (photo ${nat.toFixed(2)} in box ${box.toFixed(2)}) ${fileOf(img)}`);
    }
    // the file actually delivered vs its displayed size (next/image serves the
    // original when the request asks for more than it has)
    const shownCss = cs.objectFit === "cover" ? Math.max(r.width, r.height * nat) : r.width;
    const src = decodeURIComponent(img.currentSrc);
    const origW = Number((src.match(/[?&]w=(\d+)/) ?? [])[1]) || img.naturalWidth;
    const scale = (shownCss * 1) / Math.min(img.naturalWidth, origW);
    if (scale > 2.2) add("blur", img, `shown at ${scale.toFixed(1)}× its pixels (${Math.round(shownCss)}px from ${img.naturalWidth}px) ${fileOf(img)}`);
  }

  // Sections: overlap and gaps between direct children of main
  const main = document.querySelector("main");
  const blocks = [...main.querySelectorAll(":scope > *, :scope > * > .container > *, :scope section")].filter((b) => vis(b) && !skip(b));
  const secs = [...main.querySelectorAll(":scope > *")].filter(vis);
  for (let i = 1; i < secs.length; i++) {
    const a = secs[i - 1].getBoundingClientRect(), b = secs[i].getBoundingClientRect();
    if (b.top < a.bottom - 2 && getComputedStyle(secs[i]).position !== "absolute") add("overlap", secs[i], `overlaps previous by ${Math.round(a.bottom - b.top)}px`);
  }
  // empty bands inside sections: gaps between consecutive visible content rows
  const contentEls = [...main.querySelectorAll("h1,h2,h3,h4,p,img,li,figure,blockquote,a.btn,button,dl,table,form")].filter((e) => vis(e) && !skip(e));
  const ys = contentEls.map((e) => { const r = e.getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY]; }).sort((a, b) => a[0] - b[0]);
  let reach = ys.length ? ys[0][1] : 0;
  for (const [t, bt] of ys) {
    if (t - reach > vh * 0.6) add("gap", null, `${Math.round(t - reach)}px empty band at y=${Math.round(reach)}`);
    reach = Math.max(reach, bt);
  }

  // Container edge: section headings start on the page grid
  const c = document.querySelector("main .container");
  if (c) {
    const cs = getComputedStyle(c);
    const cl = Math.round(c.getBoundingClientRect().left + parseFloat(cs.paddingLeft));
    for (const h of main.querySelectorAll(".ed-shead__main, .ed-crumbs, h1")) {
      if (!vis(h) || skip(h) || h.closest(".ed-shead--center, .ed-story__header, .ed-hx, .ed-shero, .ed-issue__grid, .ed-issue__intro, [class*='center']")) continue;
      const l = Math.round(h.getBoundingClientRect().left);
      if (Math.abs(l - cl) > 2 && getComputedStyle(h).textAlign !== "center") add("container", h, `starts at ${l}, grid at ${cl}`);
    }
  }
  return issues;
};

const browser = await chromium.launch();
const all = [];
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const path of routes) {
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
      // bring lazy images in and fire scroll reveals
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); }
        scrollTo(0, 0);
        document.querySelectorAll("[data-armed]").forEach((e) => e.classList.add("is-visible"));
        await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); })));
      });
      await page.waitForTimeout(150);
      for (const i of await page.evaluate(probe)) all.push({ w, path, ...i });
    } catch (e) {
      all.push({ w, path, type: "error", msg: e.message.slice(0, 120) });
    }
  }
  await ctx.close();
}
await browser.close();
await fs.mkdir("screenshots", { recursive: true });
await fs.writeFile("screenshots/visual-audit.json", JSON.stringify(all, null, 1));

// Summary: by type, then distinct (type, element, message-shape) with where
const byType = {};
for (const i of all) byType[i.type] = (byType[i.type] ?? 0) + 1;
console.log(`${routes.length} routes × ${WIDTHS.join("/")} — ${all.length} findings`, byType);
const groups = new Map();
for (const i of all) {
  const k = `${i.type} ${i.el} ${i.msg.replace(/\d+/g, "#").slice(0, 70)}`;
  const g = groups.get(k) ?? { n: 0, ex: i, widths: new Set(), paths: new Set() };
  g.n++; g.widths.add(i.w); g.paths.add(i.path); groups.set(k, g);
}
for (const [k, g] of [...groups].sort((a, b) => b[1].n - a[1].n))
  console.log(`${String(g.n).padStart(4)} ${k.slice(0, 110)} | w ${[...g.widths].join(",")} | ${g.paths.size} pages e.g. ${[...g.paths][0]} :: ${g.ex.msg.slice(0, 80)}`);
