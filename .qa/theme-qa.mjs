// Theme QA: both colour themes at phone and desktop widths.
// For every visible text element, measures WCAG contrast against the colour
// actually painted behind it (ancestor backgrounds composited), and checks the
// focus ring, the mobile menu, the PDF reader, overflow and console errors.
// Usage: node theme-qa.mjs [baseUrl]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const OUT = "screenshots/theme";
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const PAGES = ["/", "/inflight-magazine", "/inflight-magazine/september-2026", "/inflight-magazine/april-2025", "/stories/travel/kolkata-forever-day-in-a-city", "/stories/interviews/ranveer-brar-conversation", "/about", "/contact", "/does-not-exist"];
const WIDTHS = [[390, 844], [1440, 900]];
const THEMES = ["light", "dark"];

// Runs in the page: contrast of all visible text, per element
const audit = (root) => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // colour painted behind an element: composite ancestor backgrounds, bottom up
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== "none" && !/gradient/.test(cs.backgroundImage)) return null; // text on a photo: not measurable
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (rootBg && rootBg.a > 0) base = rootBg;
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const fails = [];
  let checked = 0;
  const scope = root ? document.querySelector(root) : document.body;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest("[hidden], .visually-hidden, script, style, .ed-form__hp")) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || cs.display === "none" || r.width === 0 || r.height === 0 || Number(cs.opacity) === 0) continue;
    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (!fg || !bg) continue;
    const effFg = fg.a < 1 ? over(fg, bg) : fg;
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cr = ratio(effFg, bg);
    checked++;
    if (cr < need) fails.push(`${cr.toFixed(2)} < ${need} "${t.textContent.trim().slice(0, 40)}" (${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}), ${size}px)`);
  }
  return { checked, fails };
};

const results = [];
const check = (area, ok, detail) => { results.push({ area, ok, detail }); if (!ok) console.log(`FAIL [${area}] ${detail}`); };
const browser = await chromium.launch();

for (const theme of THEMES) {
  for (const [w, h] of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, reducedMotion: "reduce" });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error" && !/status of 404/.test(m.text())) errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
      const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
      const a = await page.evaluate(audit, null);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      check("contrast", a.fails.length === 0, `${theme} ${w} ${p}: ${a.checked} text elements${a.fails.length ? " — " + a.fails.slice(0, 5).join(" | ") : ""}`);
      check("scheme", scheme.includes(theme), `${theme} ${w} ${p}: color-scheme ${scheme}`);
      check("layout", !overflow && errors.length === 0, `${theme} ${w} ${p}: overflow ${overflow}, console errors ${errors.length}`);
      const tag = `${theme}-${w}-${p === "/" ? "home" : p.slice(1).replace(/\//g, "_")}`;
      await page.screenshot({ path: `${OUT}/${tag}.jpg`, type: "jpeg", quality: 70 });
      await page.close();
    }

    const page = await ctx.newPage();
    await page.goto(BASE + "/inflight-magazine/september-2026", { waitUntil: "networkidle" });
    // Focus ring must stand out against what surrounds it (WCAG non-text 3:1)
    const focus = await page.evaluate(() => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2] }; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; const p = parse(c); if (!/rgba\([^)]*,\s*0\)$/.test(c) && !/ 0\)$/.test(c)) return p; } return parse(getComputedStyle(document.documentElement).backgroundColor); };
      const out = [];
      for (const sel of [".ed-crumbs a", ".ed-header__logo", ".ed-toc__link", ".ed-footer__list a", ".btn-primary"]) {
        // first match that is actually rendered at this width
        const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length && !e.closest("[hidden]"));
        if (!el) continue;
        el.focus();
        const ring = parse(getComputedStyle(el).outlineColor);
        const around = bgOf(el.parentElement);
        out.push({ sel, ratio: +ratio(ring, around).toFixed(2), style: getComputedStyle(el).outlineStyle });
      }
      return out;
    });
    for (const f of focus) check("focus", f.style !== "none" && f.ratio >= 3, `${theme} ${w} ${f.sel}: focus ring ${f.ratio}:1 against its surroundings`);

    // Mobile menu and PDF reader
    if (w < 960) {
      await page.locator(".ed-header__toggle").click();
      const menu = await page.evaluate(audit, "#mobile-navigation");
      check("contrast", menu.fails.length === 0, `${theme} ${w} mobile menu: ${menu.checked} text elements${menu.fails.length ? " — " + menu.fails.join(" | ") : ""}`);
      await page.screenshot({ path: `${OUT}/${theme}-${w}-menu.jpg`, type: "jpeg", quality: 70 });
      await page.keyboard.press("Escape");
    }
    await page.locator(".ed-issue__hero").getByRole("button").click();
    await page.getByRole("dialog").waitFor();
    const reader = await page.evaluate(audit, '[role="dialog"]');
    check("contrast", reader.fails.length === 0, `${theme} ${w} PDF reader: ${reader.checked} text elements${reader.fails.length ? " — " + reader.fails.join(" | ") : ""}`);
    await page.keyboard.press("Escape");

    // Contact form states (validation errors) in this theme
    await page.goto(BASE + "/contact", { waitUntil: "networkidle" });
    await page.locator("button[type=submit]").click();
    await page.waitForTimeout(200);
    const form = await page.evaluate(audit, ".ed-form");
    check("contrast", form.fails.length === 0, `${theme} ${w} contact form with errors: ${form.checked} text elements${form.fails.length ? " — " + form.fails.join(" | ") : ""}`);
    await page.screenshot({ path: `${OUT}/${theme}-${w}-form-errors.jpg`, type: "jpeg", quality: 70, fullPage: false });
    await ctx.close();
  }
}

// Forced themes via data-theme override the system setting
for (const [system, forced] of [["light", "dark"], ["dark", "light"]]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: system });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const bg = await page.evaluate((forced) => { document.documentElement.dataset.theme = forced; return getComputedStyle(document.body).backgroundColor; }, forced);
  check("override", forced === "dark" ? bg === "rgb(18, 20, 24)" : bg === "rgb(255, 255, 255)", `system ${system} + data-theme="${forced}" → body ${bg}`);
  await ctx.close();
}

await browser.close();
await fs.writeFile(`${OUT}/theme-qa.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
const texts = results.filter((r) => r.area === "contrast").reduce((n, r) => n + Number((r.detail.match(/: (\d+) text elements/) || [0, 0])[1]), 0);
console.log(`\n${results.length - failed.length}/${results.length} theme checks pass (${texts} text elements measured)`);
console.log(failed.length ? `${failed.length} FAILED` : "THEME QA: ALL PASS");
