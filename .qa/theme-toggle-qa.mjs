// Theme toggle QA (production build).
// Usage: node theme-toggle-qa.mjs [baseUrl]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const OUT = "screenshots/theme-toggle";
await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const LIGHT_BG = "rgb(255, 255, 255)";
const DARK_BG = "rgb(18, 20, 24)";

const results = [];
const check = (area, ok, detail) => { results.push({ area, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} [${area}] ${detail}`); };
const browser = await chromium.launch();

async function open(opts, path = "/") {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" || /hydrat/i.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  return { ctx, page, errors };
}
const state = (page, sel = ".ed-header__actions .ed-theme-toggle") =>
  page.evaluate((sel) => {
    const b = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length) ?? document.querySelector(sel);
    const shown = (c) => { const e = b?.querySelector(c); return e ? getComputedStyle(e).display !== "none" : null; };
    let stored = null;
    try { stored = localStorage.getItem("sr-theme"); } catch {}
    return {
      attr: document.documentElement.dataset.theme ?? null,
      bg: getComputedStyle(document.body).backgroundColor,
      pressed: b?.getAttribute("aria-pressed"),
      title: b?.getAttribute("title"),
      name: b ? (b.textContent.trim() || b.getAttribute("aria-label")) : null,
      moon: shown(".ed-theme-toggle__moon"),
      sun: shown(".ed-theme-toggle__sun"),
      stored,
    };
  }, sel);

// Contrast helpers (in page)
const contrastOf = (page, fgSel, bgSel, fgProp = "color", bgProp = "backgroundColor") =>
  page.evaluate(({ fgSel, bgSel, fgProp, bgProp }) => {
    const parse = (c) => c.match(/[\d.]+/g).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const solid = (el, prop) => {
      // composite semi-transparent colours over the nearest opaque ancestor background
      let c = parse(getComputedStyle(el)[prop]);
      if ((c[3] ?? 1) >= 1) return c;
      for (let n = el.parentElement; n; n = n.parentElement) {
        const p = parse(getComputedStyle(n).backgroundColor);
        if ((p[3] ?? 1) > 0) { const a = c[3]; return [0, 1, 2].map((i) => c[i] * a + p[i] * (1 - a)); }
      }
      return c;
    };
    const vis = (s) => [...document.querySelectorAll(s)].find((e) => e.getClientRects().length);
    const a = solid(vis(fgSel), fgProp), b = solid(vis(bgSel), bgProp);
    const x = lum(a), y = lum(b);
    return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
  }, { fgSel, bgSel, fgProp, bgProp });

// 1. Default follows the device (no saved choice)
for (const scheme of ["light", "dark"]) {
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const s = await state(page);
  const dark = scheme === "dark";
  check("default", s.attr === null && s.stored === null && s.bg === (dark ? DARK_BG : LIGHT_BG) && s.pressed === String(dark) && s.moon === !dark && s.sun === dark && s.name === "Dark theme",
    `device ${scheme}, no choice → ${dark ? "dark" : "light"} page, ${dark ? "sun" : "moon"} icon, aria-pressed=${s.pressed}, title "${s.title}"`);
  check("hydration", errors.length === 0, `device ${scheme}: console errors ${errors.length}${errors.length ? " — " + errors[0].slice(0, 120) : ""}`);
  await page.screenshot({ path: `${OUT}/header-${scheme}-default.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });
  await ctx.close();
}

// 2. Choosing a theme: applies at once, is saved, survives reload without a flash
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  await page.locator(".ed-header__actions .ed-theme-toggle").click();
  let s = await state(page);
  check("toggle", s.attr === "dark" && s.bg === DARK_BG && s.stored === "dark" && s.pressed === "true" && s.sun && !s.moon && s.title === "Switch to light theme",
    `click → dark page, saved "${s.stored}", aria-pressed=true, sun icon, title "${s.title}"`);
  await page.screenshot({ path: `${OUT}/header-light-to-dark.png`, clip: { x: 0, y: 0, width: 1440, height: 120 } });

  // Reload: the pre-paint script must set the theme as soon as <body> starts
  await page.goto(BASE + "/inflight-magazine", { waitUntil: "commit" });
  await page.waitForFunction(() => document.body && document.body.children.length > 0);
  const early = await page.evaluate(() => ({ attr: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
  await page.waitForLoadState("networkidle");
  s = await state(page);
  check("persist", early.attr === "dark" && s.attr === "dark" && s.bg === DARK_BG && s.pressed === "true",
    `next page load: data-theme="${early.attr}" already set as <body> starts (no flash), stays dark after hydration`);

  await page.locator(".ed-header__actions .ed-theme-toggle").click();
  s = await state(page);
  check("toggle", s.attr === "light" && s.bg === LIGHT_BG && s.stored === "light" && s.pressed === "false" && s.moon, `click again → light, saved "${s.stored}"`);
  check("hydration", errors.length === 0, `toggling and reloading: console errors ${errors.length}${errors.length ? " — " + errors[0].slice(0, 120) : ""}`);
  await ctx.close();
}

// 3. A saved choice beats the device setting
{
  const { ctx, page } = await open({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  await page.evaluate(() => localStorage.setItem("sr-theme", "light"));
  await page.reload({ waitUntil: "networkidle" });
  const s = await state(page);
  check("persist", s.attr === "light" && s.bg === LIGHT_BG && s.pressed === "false", `device dark + saved "light" → light page`);
  await ctx.close();
}

// 4. Keyboard: reachable, visible focus, Enter and Space toggle
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.classList.contains("ed-theme-toggle"));
  }
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  await page.keyboard.press("Enter");
  const afterEnter = (await state(page)).attr;
  await page.keyboard.press("Space");
  const afterSpace = (await state(page)).attr;
  check("keyboard", reached && ring !== "none" && afterEnter === "dark" && afterSpace === "light", `Tab reaches the toggle (focus ring ${ring}), Enter → ${afterEnter}, Space → ${afterSpace}`);
  await ctx.close();
}

// 5. Phones: the switch in the menu
for (const scheme of ["light", "dark"]) {
  const { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const barHidden = await page.evaluate(() => !document.querySelector(".ed-header__actions .ed-theme-toggle").getClientRects().length);
  await page.locator(".ed-header__toggle").click();
  const row = "#mobile-navigation .ed-theme-toggle";
  const knob = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#mobile-navigation .ed-theme-toggle__knob")).transform).m41);
  const before = { ...(await state(page, row)), knob: await knob() };
  const track = await contrastOf(page, "#mobile-navigation .ed-theme-toggle__switch", "#mobile-navigation", "backgroundColor");
  const knobOnTrack = await contrastOf(page, "#mobile-navigation .ed-theme-toggle__knob", "#mobile-navigation .ed-theme-toggle__switch", "backgroundColor");
  await page.screenshot({ path: `${OUT}/menu-${scheme}-before.png` });
  await page.locator(row).click();
  await page.waitForTimeout(300);
  const after = { ...(await state(page, row)), knob: await knob() };
  const menuOpen = await page.evaluate(() => !document.getElementById("mobile-navigation").hidden);
  const focusOnToggle = await page.evaluate(() => document.activeElement?.classList.contains("ed-theme-toggle"));
  await page.screenshot({ path: `${OUT}/menu-${scheme}-after.png` });
  const want = scheme === "light" ? "dark" : "light";
  check("mobile", barHidden && before.name.includes("Dark theme") && after.attr === want && after.pressed === String(want === "dark") && before.knob !== after.knob && menuOpen && focusOnToggle,
    `390 ${scheme}: header icon hidden, menu switch "Dark theme" → ${want} (knob ${before.knob}px → ${after.knob}px), menu stays open, focus kept`);
  check("contrast", track >= 3 && knobOnTrack >= 3, `390 ${scheme}: switch track ${track}:1 against the menu, knob ${knobOnTrack}:1 against the track`);
  const track2 = await contrastOf(page, "#mobile-navigation .ed-theme-toggle__switch", "#mobile-navigation", "backgroundColor");
  const knob2 = await contrastOf(page, "#mobile-navigation .ed-theme-toggle__knob", "#mobile-navigation .ed-theme-toggle__switch", "backgroundColor");
  check("contrast", track2 >= 3 && knob2 >= 3, `390 after switching: track ${track2}:1, knob ${knob2}:1`);
  await page.keyboard.press("Escape");
  check("hydration", errors.length === 0, `390 ${scheme}: console errors ${errors.length}`);
  await ctx.close();
}

// 6. Icon contrast on the header band, both themes
for (const scheme of ["light", "dark"]) {
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const icon = await contrastOf(page, ".ed-header__actions .ed-theme-toggle", ".ed-header");
  check("contrast", icon >= 3, `${scheme} header: toggle icon ${icon}:1 against the band`);
  await ctx.close();
}

// 7. Another open tab follows the choice
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light" });
  const a = await ctx.newPage();
  const b = await ctx.newPage();
  await a.goto(BASE + "/", { waitUntil: "networkidle" });
  await b.goto(BASE + "/about", { waitUntil: "networkidle" });
  await a.locator(".ed-header__actions .ed-theme-toggle").click();
  await b.waitForFunction(() => document.documentElement.dataset.theme === "dark", null, { timeout: 5000 }).catch(() => {});
  const sb = await state(b);
  check("sync", sb.attr === "dark" && sb.bg === DARK_BG && sb.pressed === "true", `choice in one tab → other tab switched to ${sb.attr}`);
  await ctx.close();
}

// 8. Without storage (private mode) the toggle still works for the page
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light" });
  await ctx.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.locator(".ed-header__actions .ed-theme-toggle").click();
  const attr = await page.evaluate(() => document.documentElement.dataset.theme);
  check("storage", attr === "dark" && errors.length === 0, `storage blocked → toggle still switches (${attr}), no errors`);
  await ctx.close();
}

await browser.close();
await fs.writeFile(`${OUT}/theme-toggle-qa.json`, JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} toggle checks pass`);
console.log(failed.length ? `${failed.length} FAILED` : "THEME TOGGLE QA: ALL PASS");
