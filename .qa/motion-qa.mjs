// Motion QA: scroll reveals arm below the fold only, every armed block is
// shown after a full scroll (nothing left hidden), nothing is armed under
// reduced motion, no console errors, and navigation runs the route entrance.
// Usage: node motion-qa.mjs [baseUrl]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const PAGES = ["/", "/inflight-magazine", "/inflight-magazine/august-2026", "/inflight-magazine/april-2025", "/stories/destinations/dreaming-of-munnar", "/stories/conversations/shalini-passi-a-life-shaped-by-art", "/about", "/contact", "/search?category=travel-escapes"];
const results = [];
const check = (ok, detail) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"} ${detail}`); };
const browser = await chromium.launch();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const reduced of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    for (const p of PAGES) {
     for (let attempt = 0; attempt < 2; attempt++) {
     try {
      await page.goto(BASE + p, { waitUntil: "load" });
      await page.waitForTimeout(300);
      const top = await page.evaluate(() => {
        const armed = [...document.querySelectorAll('[data-motion="armed"]')];
        return { armed: armed.length, aboveFold: armed.filter((e) => e.getBoundingClientRect().top < innerHeight * 0.9).length };
      });
      // scroll through the page as a reader would
      const H = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= H; y += Math.round(h * 0.7)) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(90); }
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => ({
        left: [...document.querySelectorAll('[data-motion="armed"]')].map((e) => e.className.toString().slice(0, 40)),
        hidden: [...document.querySelectorAll("[data-motion]")].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      const tag = `${w}${reduced ? " reduced" : ""} ${p}`;
      if (reduced) check(top.armed === 0 && after.hidden === 0, `${tag}: nothing armed under reduced motion (armed ${top.armed})`);
      else check(top.aboveFold === 0 && after.left.length === 0 && after.hidden === 0 && !after.overflow,
        `${tag}: ${top.armed} armed below the fold, all shown after scrolling${after.left.length ? ` — STILL HIDDEN: ${after.left.join(" | ")}` : ""}${top.aboveFold ? ` — ${top.aboveFold} ABOVE FOLD` : ""}${after.overflow ? " — H-OVERFLOW" : ""}`);
      break;
     } catch (e) {
      // a dev server reloading mid-check: try the page once more
      if (attempt === 1 || !/context was destroyed|navigation/i.test(String(e))) throw e;
     }
     }
    }
    // route entrance on client navigation
    await page.goto(BASE + "/", { waitUntil: "load" });
    const link = page.locator('main a[href="/inflight-magazine"]:visible').first();
    await link.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(/\/inflight-magazine$/), link.click()]);
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector(".ed-route")).animationName);
    check(reduced ? anim === "none" : anim === "ed-route-in", `${w}${reduced ? " reduced" : ""}: route entrance on navigation = ${anim}`);
    check(errors.length === 0, `${w}${reduced ? " reduced" : ""}: no console errors${errors.length ? ` — ${errors.slice(0, 3).join(" | ")}` : ""}`);
    await ctx.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} MOTION CHECK(S) FAILED` : `\nMOTION QA: ALL ${results.length} PASS`);
