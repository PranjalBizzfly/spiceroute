// Prompt 3 real-browser QA (Chromium): archive, latest / middle / oldest
// editions, and an article reached from an edition page. Measures layout,
// exercises navigation, the PDF viewer, archive filters and keyboard focus.
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const WIDTHS = [[320, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];
const OUT = "screenshots/p3";

const probe = () => {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0; };
  const describe = (el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.innerText || el.alt || "").trim().slice(0, 40)}"`;
  const scroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { const r = p.getBoundingClientRect(); if (r.left >= -1 && r.right <= vw + 1) return true; } } return false; };
  const overflow = [], textOverflow = [], tiny = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if ((r.right > vw + 1 || r.left < -1) && !scroller(el)) overflow.push(describe(el));
    const cs = getComputedStyle(el);
    if (/^(H[1-6]|P|A|BUTTON|LI|DD|DT)$/.test(el.tagName) && cs.overflowX === "visible" && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.display !== "inline") textOverflow.push(describe(el));
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(cs.fontSize) < 11 && !el.closest(".visually-hidden")) tiny.add(`${describe(el)} ${cs.fontSize}`);
  }
  const imgs = [...document.images].filter((img) => !img.closest(".ed-issue__ambient")).filter(visible).map((img) => { const r = img.getBoundingClientRect(); const nat = img.naturalWidth / (img.naturalHeight || 1); const box = r.width / (r.height || 1); return { src: (img.currentSrc || img.src).slice(-60), complete: img.complete, nw: img.naturalWidth, fit: getComputedStyle(img).objectFit, shown: Math.min(box / nat, nat / box), distortion: getComputedStyle(img).objectFit === "fill" ? Math.abs(box - nat) / nat : 0 }; });
  const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((h) => Number(h.tagName[1]));
  let prev = 0, skips = 0; for (const l of heads) { if (l > prev + 1) skips++; prev = l; }
  return {
    vw, scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    overflow: overflow.slice(0, 5), overflowCount: overflow.length, textOverflow: textOverflow.slice(0, 5), tiny: [...tiny].slice(0, 5),
    broken: imgs.filter((i) => i.complete && i.nw === 0).map((i) => i.src),
    distorted: imgs.filter((i) => i.distortion > 0.03).map((i) => i.src),
    cropped: imgs.filter((i) => i.fit === "cover" && i.nw && i.shown < 0.5).map((i) => `${i.src} ${(i.shown * 100) | 0}%`),
    h1: heads.filter((h) => h === 1).length, headingSkips: skips,
    stuck: document.querySelectorAll('.ed-reveal[data-armed="true"]:not(.is-visible)').length,
  };
};

async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 110)); }
    // edition rails on phones scroll sideways: bring every card into view
    for (const rail of document.querySelectorAll(".ed-editions")) { rail.scrollIntoView({ block: "center", behavior: "instant" }); for (let x = 0; x <= rail.scrollWidth; x += 150) { rail.scrollTo({ left: x, behavior: "instant" }); await new Promise((r) => setTimeout(r, 80)); } rail.scrollTo({ left: 0, behavior: "instant" }); }
    scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
}

async function shot(page, selector, file) {
  const el = page.locator(selector).first();
  if (!(await el.count())) return;
  await el.evaluate((n) => n.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(700);
  await el.screenshot({ path: file, animations: "disabled" });
}

async function pdfCheck(page, triggerText) {
  const btn = page.getByRole("button", { name: new RegExp(triggerText) }).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  const src = await dialog.locator("iframe").getAttribute("src");
  const locked = await page.evaluate(() => document.body.style.overflow === "hidden");
  const onTop = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const r = d.getBoundingClientRect(); const el = document.elementFromPoint(r.left + 20, r.top + 20); return d.contains(el); });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const closed = !(await dialog.isVisible().catch(() => false));
  const focusBack = await page.evaluate((t) => (document.activeElement?.textContent ?? "").includes(t), triggerText);
  const unlocked = await page.evaluate(() => document.body.style.overflow === "");
  return { src, locked, onTop, closed, focusBack, unlocked, ok: !!src && locked && onTop && closed && focusBack && unlocked };
}

const browser = await chromium.launch();
await fs.rm(OUT, { recursive: true, force: true });
const report = [];

for (const [w, h] of WIDTHS) {
  const dir = `${OUT}/${w}`;
  await fs.mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console ${m.text().slice(0, 140)}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`));
  const entry = { width: w, pages: {}, checks: {} };

  // ---------------- Archive ----------------
  await page.goto(`${BASE}/inflight-magazine`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/archive-01-top.png` });
  await settle(page);
  entry.pages.archive = await page.evaluate(probe);
  await shot(page, ".ed-archive__controls", `${dir}/archive-02-controls.png`);
  await shot(page, ".ed-archive__group", `${dir}/archive-03-grid.png`);
  const cardsAll = await page.locator(".ed-archive__grid .ed-edition").count();
  await page.getByRole("button", { name: /^2024/ }).click();
  await page.waitForTimeout(250);
  const cards2024 = await page.locator(".ed-archive__grid .ed-edition").count();
  const pressed = await page.getByRole("button", { name: /^2024/ }).getAttribute("aria-pressed");
  await page.getByRole("button", { name: /^All years/ }).click();
  await page.locator("#archive-search").fill("Flavour Maverick");
  await page.waitForTimeout(250);
  const hitHref = await page.locator(".ed-archive__hit").first().getAttribute("href").catch(() => null);
  const cardsSearch = await page.locator(".ed-archive__grid .ed-edition").count();
  await shot(page, ".ed-archive", `${dir}/archive-04-search.png`);
  await page.locator("#archive-search").fill("zzzz");
  await page.waitForTimeout(200);
  const empty = await page.locator(".ed-archive__empty").isVisible();
  await page.getByRole("button", { name: "Show all editions" }).click();
  const reset = await page.locator(".ed-archive__grid .ed-edition").count();
  entry.checks.archive = { cardsAll, cards2024, pressed, hitHref, cardsSearch, empty, reset, ok: cardsAll === 29 && cards2024 === 8 && pressed === "true" && hitHref === "/stories/interviews/ranveer-brar-conversation" && cardsSearch === 1 && empty && reset === 29 };
  if (w === 390 || w === 1440) entry.checks.archivePdf = await pdfCheck(page, "View Original PDF");

  // ---------------- Editions: latest / middle / oldest ----------------
  for (const [name, slug] of [["latest", "september-2026"], ["middle", "april-2025"], ["oldest", "february-2024"], ["web-middle", "august-2026"]]) {
    await page.goto(`${BASE}/inflight-magazine/${slug}`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${dir}/${name}-01-hero.png` });
    await settle(page);
    entry.pages[name] = await page.evaluate(probe);
    await shot(page, "section[aria-labelledby='featured-title']", `${dir}/${name}-02-featured.png`);
    await shot(page, "#in-this-issue", `${dir}/${name}-03-contents.png`);
    await shot(page, "section[aria-labelledby='read-pdf-title']", `${dir}/${name}-03-pdfpanel.png`);
    await shot(page, "section[aria-labelledby='print-title']", `${dir}/${name}-04-printband.png`);
    await shot(page, "section[aria-label='More editions']", `${dir}/${name}-05-navigation.png`);
    if (name === "latest") await shot(page, "footer", `${dir}/${name}-06-footer.png`);

    // PDF CTA
    if (w === 390 || w === 1440 || w === 768) {
      entry.checks[`${name}Pdf`] = await pdfCheck(page, name === "middle" ? "Read this edition online" : "View Original PDF");
    }
    // Prev/next edition by click
    const prev = page.locator('nav[aria-label="Edition navigation"] a[rel="prev"]');
    const next = page.locator('nav[aria-label="Edition navigation"] a[rel="next"]');
    entry.checks[`${name}Nav`] = { prev: await prev.count(), next: await next.count() };
  }

  // Click-through: latest → previous edition → back via next
  await page.goto(`${BASE}/inflight-magazine/september-2026`, { waitUntil: "load" });
  await page.locator('nav[aria-label="Edition navigation"] a[rel="prev"]').click();
  await page.waitForURL("**/inflight-magazine/august-2026");
  await page.locator('nav[aria-label="Edition navigation"] a[rel="next"]').click();
  await page.waitForURL("**/inflight-magazine/september-2026");
  entry.checks.editionClickThrough = true;

  // Keyboard: first Tab reaches the skip link, focus is visible
  await page.goto(`${BASE}/inflight-magazine/september-2026`, { waitUntil: "load" });
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), outline: getComputedStyle(document.activeElement).outlineStyle, visible: document.activeElement?.getBoundingClientRect().top >= 0 }));
  let tabbedTo = null;
  for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); const t = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""); if (/View Original PDF/.test(t)) { tabbedTo = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle); break; } }
  entry.checks.keyboard = { skipLink: firstFocus.text, pdfReachableByTab: !!tabbedTo, focusOutline: tabbedTo, ok: /Skip to main content/.test(firstFocus.text ?? "") && tabbedTo && tabbedTo !== "none" };

  // ---------------- Article reached from an edition ----------------
  await page.goto(`${BASE}/inflight-magazine/september-2026`, { waitUntil: "load" });
  const link = page.locator(".ed-toc__link").nth(1); // second story in printed order
  const href = await link.getAttribute("href");
  await link.evaluate((n) => n.scrollIntoView({ block: "center", behavior: "instant" }));
  await link.click();
  await page.waitForURL(`**${href}`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${dir}/article-01-top.png` });
  await settle(page);
  entry.pages.article = await page.evaluate(probe);
  await shot(page, 'nav[aria-label="Story navigation"]', `${dir}/article-02-pager.png`);
  await shot(page, ".ed-story__related", `${dir}/article-03-related.png`);
  const crumbs = await page.locator('nav[aria-label="Breadcrumb"] li').allInnerTexts();
  const nextHref = await page.locator('nav[aria-label="Story navigation"] a[rel="next"]').getAttribute("href");
  await page.locator('nav[aria-label="Story navigation"] a[rel="next"]').click();
  await page.waitForURL(`**${nextHref}`);
  entry.checks.article = { from: href, crumbs, nextHref, ok: crumbs.length === 4 && crumbs[2] === "September 2026" && !!nextHref };

  entry.errors = [...new Set(errors)];
  report.push(entry);
  await ctx.close();
  console.log(`done ${w}`);
}

// Reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/inflight-magazine/september-2026`, { waitUntil: "load" });
  report.push({ width: "390 reduced-motion", armed: await page.locator('.ed-reveal[data-armed="true"]').count(), heroAnimation: await page.locator(".ed-issue__title").evaluate((el) => getComputedStyle(el).animationName) });
  await ctx.close();
}

await browser.close();
await fs.writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 1));
let issues = 0;
for (const e of report) {
  if (!e.pages) { console.log(JSON.stringify(e)); continue; }
  const bad = [];
  for (const [n, p] of Object.entries(e.pages)) {
    const i = [];
    if (p.scrollWidth > p.vw) i.push(`h-scroll ${p.scrollWidth}>${p.vw}`);
    if (p.overflowCount) i.push(`overflow ${p.overflow.join(" | ")}`);
    if (p.textOverflow.length) i.push(`text-overflow ${p.textOverflow.join(" | ")}`);
    if (p.tiny.length) i.push(`tiny ${p.tiny.join(" | ")}`);
    if (p.broken.length) i.push(`broken ${p.broken.join(" | ")}`);
    if (p.distorted.length) i.push(`distorted ${p.distorted.join(" | ")}`);
    if (p.cropped.length) i.push(`cropped ${p.cropped.join(" | ")}`);
    if (p.h1 !== 1) i.push(`h1=${p.h1}`);
    if (p.headingSkips) i.push(`heading skips ${p.headingSkips}`);
    if (i.length) bad.push(`${n}: ${i.join("; ")}`);
  }
  const failedChecks = Object.entries(e.checks).filter(([, v]) => v && typeof v === "object" && "ok" in v && !v.ok).map(([k, v]) => `${k} ${JSON.stringify(v)}`);
  issues += bad.length + failedChecks.length + e.errors.length;
  console.log(`${String(e.width).padEnd(5)} checks ${failedChecks.length ? "FAIL " + failedChecks.join(" ; ") : "ok"} | errors ${e.errors.length}${e.errors.length ? " " + e.errors.slice(0, 3).join(" ; ") : ""} | ${bad.length ? bad.join(" ;; ") : "layout clean"}`);
}
console.log(issues ? `${issues} ISSUE(S)` : "EDITION QA: ALL CLEAN");
