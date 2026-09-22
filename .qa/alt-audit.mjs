// Alt-text audit across every sitemap route: each rendered <img> with its alt,
// grouped by image. Flags missing alt, empty alt, generic or filename-like alt.
// Writes tmp/alt-audit.json. Usage (from .qa/): node alt-audit.mjs [baseUrl]
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3001";
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
routes.push("/this-page-does-not-exist");

const GENERIC = /^(image|photo|picture|img|thumbnail|banner|hero|cover|logo|icon|untitled|graphic)s?\.?$/i;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const seen = new Map(); // src -> { alts:Set, pages:Set, contexts:Set }
const missing = [];
let done = 0;
const queue = [...routes];
async function worker() {
  const page = await ctx.newPage();
  while (queue.length) {
    const route = queue.shift();
    try {
      await page.goto(BASE + route, { waitUntil: "load", timeout: 120000 });
      const imgs = await page.evaluate(() =>
        [...document.images].map((i) => {
          const raw = i.currentSrc || i.getAttribute("src") || "";
          let src = raw;
          try {
            const u = new URL(raw, location.href);
            src = u.searchParams.get("url") ?? u.pathname;
          } catch {}
          const inLink = i.closest("a");
          return {
            src: decodeURIComponent(src),
            alt: i.getAttribute("alt"),
            hidden: Boolean(i.closest("[aria-hidden='true']")),
            linkText: inLink ? inLink.innerText.trim().replace(/\s+/g, " ").slice(0, 60) : "",
            ctx: (i.closest("[class]")?.className || "").toString().split(" ")[0],
          };
        }),
      );
      for (const im of imgs) {
        if (im.alt === null) missing.push(`${route} ${im.src}`);
        const e = seen.get(im.src) ?? { alts: new Set(), pages: new Set(), contexts: new Set(), hidden: im.hidden, linkText: im.linkText };
        e.alts.add(im.alt ?? "<<MISSING>>");
        e.pages.add(route);
        e.contexts.add(im.ctx);
        seen.set(im.src, e);
      }
    } catch (err) {
      console.log("fail", route, err.message.slice(0, 80));
    }
    if (++done % 40 === 0) console.log(done, "/", routes.length);
  }
  await page.close();
}
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close();

const rows = [...seen].map(([src, e]) => ({ src, alts: [...e.alts], pages: e.pages.size, example: [...e.pages][0], contexts: [...e.contexts], hidden: e.hidden, linkText: e.linkText }));
const empty = rows.filter((r) => r.alts.includes(""));
const generic = rows.filter((r) => r.alts.some((a) => a && (GENERIC.test(a.trim()) || /\.(webp|png|jpe?g)$/i.test(a) || a.trim().length < 4)));
fs.writeFileSync("tmp/alt-audit.json", JSON.stringify({ rows, missing }, null, 1));
console.log(`routes ${routes.length}, unique images ${rows.length}`);
console.log(`missing alt attribute: ${missing.length}`);
console.log(`images rendered with empty alt somewhere: ${empty.length}`);
const byCtx = {};
for (const r of empty) for (const c of r.contexts) byCtx[c] = (byCtx[c] ?? 0) + 1;
console.log("  empty-alt by container:", JSON.stringify(byCtx));
console.log(`generic / filename / too-short alt: ${generic.length}`);
for (const g of generic.slice(0, 20)) console.log("  ", g.src, JSON.stringify(g.alts));
