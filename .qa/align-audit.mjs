// Measured alignment audit across page types and breakpoints.
// Reports: horizontal overflow, text touching the viewport edge, and
// elements that should share an edge (container, article column) but don't.
// Usage: node align-audit.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3140";
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const PAGES = {
  home: "/",
  about: "/about",
  contact: "/contact",
  archive: "/inflight-magazine",
  edition: "/inflight-magazine/september-2026",
  pdfonly: "/inflight-magazine/april-2024",
  kolkata: "/stories/travel-escapes/kolkata-forever-day-in-a-city",
  interview: "/stories/conversations/ranveer-brar-conversation",
  ladakh: "/stories/destinations/many-shades-of-ladakh",
  petyoga: "/stories/health-healing/fur-all-pet-yoga",
  predictions: "/stories/predictions/predictions-june-2026",
  welcome: "/stories/welcome-aboard/welcome-aboard-september-2026",
};

const probe = () => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`OVERFLOW page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
  const vis = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const L = (el) => Math.round(el.getBoundingClientRect().left);
  const R = (el) => Math.round(el.getBoundingClientRect().right);
  const name = (el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`;

  // Container content edges
  const c = document.querySelector("main .container");
  const cs = getComputedStyle(c);
  const cl = Math.round(c.getBoundingClientRect().left + parseFloat(cs.paddingLeft));
  const cr = Math.round(c.getBoundingClientRect().right - parseFloat(cs.paddingRight));

  // Text never touches the viewport edges (outside scroll rails)
  for (const el of document.querySelectorAll("main h1, main h2, main h3, main p, main li, footer p, footer a, header a")) {
    if (!vis(el) || el.closest(".ed-editions, .ed-triptych, .ed-shelf__track, [hidden], .visually-hidden, .ed-lightbox")) continue;
    const r = el.getBoundingClientRect();
    if (r.width && (r.left < 10 || r.right > vw - 10)) out.push(`EDGE ${name(el)} "${el.textContent.trim().slice(0, 30)}" [${Math.round(r.left)}→${Math.round(r.right)}]`);
  }

  // Header, crumbs, footer share the container edges
  for (const sel of [".ed-header__bar", ".ed-crumbs", ".ed-pfoot__grid, .ed-footer__grid"]) {
    const el = document.querySelector(sel);
    if (!el || !vis(el)) continue;
    const box = sel === ".ed-header__bar" ? (() => { const s = getComputedStyle(el); return [L(el) + parseFloat(s.paddingLeft), R(el) - parseFloat(s.paddingRight)]; })() : [L(el), R(el)];
    if (Math.abs(box[0] - cl) > 1) out.push(`EDGE-MISMATCH ${sel} left ${Math.round(box[0])} vs container ${cl}`);
    if (sel !== ".ed-crumbs" && Math.abs(box[1] - cr) > 1) out.push(`EDGE-MISMATCH ${sel} right ${Math.round(box[1])} vs container ${cr}`);
  }

  // Article: every part shares the reading column's left edge
  const art = document.querySelector(".ed-article");
  if (art) {
    const al = L(art);
    const parts = [
      ...art.querySelectorAll(":scope > p, :scope > h2, :scope > h3, :scope > blockquote, :scope > figure, .ed-gallery__row, .ed-gallery__caption, .ed-fold"),
      ...document.querySelectorAll(".ed-article__callouts, .ed-story__tags, .ed-instory__compact"),
    ];
    for (const el of parts) {
      if (vis(el) && Math.abs(L(el) - al) > 1) out.push(`ARTICLE-EDGE ${name(el)} left ${L(el)} vs column ${al}`);
    }
    // the story's contents rail: in the newspaper layout it sits in the right
    // side column, sharing that column's left edge
    const rail = document.querySelector(".ed-instory__rail");
    const side = document.querySelector(".ed-news__rail");
    if (rail && vis(rail)) {
      const edge = side && side.contains(rail) ? L(side) : cl;
      if (Math.abs(L(rail) - edge) > 1) out.push(`RAIL left ${L(rail)} vs ${side ? "side column" : "container"} ${edge}`);
    }
    for (const sel of [".ed-pager--story", ".ed-story__issue", ".ed-story__related"]) {
      const el = document.querySelector(sel);
      if (el && vis(el) && (Math.abs(L(el) - cl) > 1 || Math.abs(R(el) - cr) > 1)) out.push(`END-MATTER ${sel} [${L(el)}→${R(el)}] vs container [${cl}→${cr}]`);
    }
    // numbered subheads: title text starts at one x
    const starts = new Set([...art.querySelectorAll("h2.ed-article__subhead")].filter(vis).map((h) => {
      const n = h.querySelector(".ed-article__num");
      return n ? Math.round(n.getBoundingClientRect().right) : null;
    }).filter((x) => x !== null));
    if (starts.size > 1) out.push(`SUBHEAD-NUM slot widths differ: ${[...starts].join(",")}`);
    out.push(`info: container ${cl}→${cr}, column ${al}→${R(art)}`);
  }
  return out;
};

const browser = await chromium.launch();
let problems = 0;
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const [key, path] of Object.entries(PAGES)) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const res = await page.evaluate(probe);
    const bad = res.filter((r) => !r.startsWith("info"));
    problems += bad.length;
    const info = res.find((r) => r.startsWith("info")) ?? "";
    if (bad.length || process.env.VERBOSE) console.log(`${w} ${key} ${info}\n  ${bad.join("\n  ")}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${problems} problems`);
