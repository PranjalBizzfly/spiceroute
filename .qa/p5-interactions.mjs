// Prompt 5 functional QA: real clicks through every important journey on the
// production build, at phone and desktop widths.
// Usage: node p5-interactions.mjs [baseUrl]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const results = [];
const check = (area, w, ok, detail) => { results.push({ area, w, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} [${area}@${w}] ${detail}`); };

const browser = await chromium.launch();

async function session(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = "html{scroll-behavior:auto!important}";
      document.head.appendChild(s);
    });
  });
  return { ctx, page, errors };
}
const go = (page, p) => page.goto(BASE + p, { waitUntil: "networkidle" });
const h1 = (page) => page.locator("h1").first().innerText();
const path = (page) => new URL(page.url()).pathname + new URL(page.url()).hash;

/**
 * Clicks, waits for the navigation, returns [pathname, h1]. With { atPoint },
 * clicks the centre of the element on screen, as a visitor would — used for
 * card photographs, which are covered by the card's stretched link.
 */
async function follow(page, locator, { atPoint = false } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const before = page.url();
  if (atPoint) {
    const box = await locator.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForURL((u) => u.href !== before, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
  } else {
    await Promise.all([page.waitForLoadState("networkidle"), locator.click()]);
  }
  await page.waitForTimeout(250);
  return [path(page), (await h1(page)).replace(/\s+/g, " ")];
}

async function pdfViewer(page, button, pdfUrl) {
  await button.scrollIntoViewIfNeeded();
  await button.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  const info = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const iframe = d.querySelector("iframe");
    const tab = [...d.querySelectorAll("a")].find((a) => /new tab/i.test(a.textContent));
    const dl = [...d.querySelectorAll("a")].find((a) => a.hasAttribute("download"));
    return { src: iframe?.getAttribute("src"), tab: tab && { href: tab.getAttribute("href"), target: tab.target, rel: tab.rel }, dl: dl?.getAttribute("href"), locked: getComputedStyle(document.body).overflow === "hidden" };
  });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  const focusBack = await page.evaluate(() => document.activeElement?.tagName === "BUTTON");
  const ok = info.src?.startsWith(pdfUrl) && info.tab?.href === pdfUrl && info.tab?.target === "_blank" && /noopener/.test(info.tab?.rel ?? "") && info.dl === pdfUrl && info.locked && focusBack;
  return { ok, info, focusBack };
}

const SEPT_PDF = "https://spiceroutemagazine.in/wp-content/uploads/2026/09/11-Sep_Lowres-SpiceRoute_Sep.pdf";

for (const [w, h] of [[390, 844], [1440, 900]]) {
  const mobile = w < 960;
  const { ctx, page, errors } = await session(w, h);

  // ---------------- HEADER ----------------
  await go(page, "/about");
  for (const [label, want] of [["Magazine", "/inflight-magazine"], ["Contact", "/contact"], ["About", "/about"], ["Home", "/"]]) {
    if (mobile) await page.locator(".ed-header__toggle").click();
    const link = mobile ? page.locator(".ed-drawer__link", { hasText: new RegExp(`^${label}$`) }) : page.locator(".ed-header__nav a", { hasText: new RegExp(`^${label}$`) });
    const [p] = await follow(page, link);
    check("header", w, p === want, `${mobile ? "menu" : "nav"} "${label}" → ${p}`);
  }
  if (mobile) await page.locator(".ed-header__toggle").click();
  const cta = mobile ? page.locator("#mobile-navigation .btn-primary") : page.locator(".ed-header__actions .btn-primary");
  let [p, t] = await follow(page, cta);
  check("header", w, p === "/inflight-magazine/september-2026", `"Read September 2026" → ${p}`);

  if (mobile) {
    await go(page, "/");
    await page.locator(".ed-header__toggle").focus();
    await page.keyboard.press("Enter");
    const opened = await page.evaluate(() => !document.getElementById("mobile-navigation").hidden);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    const st = await page.evaluate(() => ({ closed: document.getElementById("mobile-navigation").hidden, focus: document.activeElement?.classList.contains("ed-header__toggle") }));
    check("header", w, opened && st.closed && st.focus, `keyboard: Enter opens menu, Escape closes it and returns focus to the toggle`);
    await page.keyboard.press("Enter");
    for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
    const left = await page.evaluate(() => ({ closed: document.getElementById("mobile-navigation").hidden, inHeader: Boolean(document.activeElement?.closest("header")) }));
    check("header", w, left.closed || left.inHeader, `tabbing past the last menu item ${left.closed ? "closes the menu" : "stays in the menu"}`);
  }

  // ---------------- HOME ----------------
  await go(page, "/");
  [p] = await follow(page, page.locator(".ed-issuefront .btn-primary"));
  check("home", w, p === "/inflight-magazine/september-2026", `issue front "Read this issue" → ${p}`);
  await go(page, "/");
  [p] = await follow(page, page.locator('main a[href="/inflight-magazine"]').first());
  check("home", w, p === "/inflight-magazine", `"all editions" link → ${p}`);
  await go(page, "/");
  [p] = await follow(page, page.locator(".ed-shero__btn"));
  check("home", w, p === "/contact", `"Publish Your Story" → ${p}`);
  await go(page, "/");
  [p, t] = await follow(page, page.locator(".ed-issuefront__lead .ed-card__plate"), { atPoint: true });
  check("home", w, p.startsWith("/stories/") && t.length > 0, `issue lead story → ${p} ("${t}")`);
  await go(page, "/");
  // the whole card is the link: click the photograph, not the headline
  [p, t] = await follow(page, page.locator(".ed-featured__lead .ed-card__plate"), { atPoint: true });
  check("home", w, p.startsWith("/stories/") && t.length > 0, `featured card (click on photo) → ${p} ("${t}")`);
  await go(page, "/");
  [p, t] = await follow(page, page.locator(".ed-strip__item").first().locator(".ed-card__link"));
  check("home", w, p.startsWith("/stories/") && /World Rhino Day/.test(t), `latest strip story → ("${t}")`);
  await go(page, "/");
  [p, t] = await follow(page, page.locator("#cuisine .ed-card__link").first());
  check("home", w, p.startsWith("/stories/cuisine/"), `food story → ${p}`);
  await go(page, "/");
  const shelfCard = page.locator(".ed-shelf__rest .ed-edition").first();
  if (mobile) await shelfCard.scrollIntoViewIfNeeded();
  [p, t] = await follow(page, shelfCard.locator(".ed-edition__cover"), { atPoint: true });
  check("home", w, p === "/inflight-magazine/august-2026", `edition card (click on cover) → ${p}`);
  await go(page, "/");
  const shelfPdf = await pdfViewer(page, page.locator(".ed-shelf__issue").getByRole("button"), SEPT_PDF);
  check("home", w, shelfPdf.ok, `latest edition "View Original PDF" → reader (iframe, new-tab + download links), Escape closes, focus returns`);

  // footer (from an article, so anchors cross pages)
  for (const [label, want, id] of [["Travel & Destinations", "/#travel", "travel"], ["Culture & Wellness", "/#culture", "culture"], ["All 29 editions", "/inflight-magazine"], ["September 2026 issue", "/inflight-magazine/september-2026"], ["About", "/about"], ["Contact", "/contact"]]) {
    await go(page, "/stories/wellness/fur-all-pet-yoga");
    [p] = await follow(page, page.locator("footer a", { hasText: new RegExp(`^${label.replace(/[&]/g, "\\&")}$`) }));
    let inView = true;
    if (id) {
      await page.waitForTimeout(400);
      inView = await page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); const hb = document.querySelector(".ed-header").getBoundingClientRect().bottom; return r.top >= hb - 2 && r.top < innerHeight; }, id);
    }
    check("footer", w, p === want && inView, `"${label}" → ${p}${id ? (inView ? " (section in view below the header)" : " (section NOT in view)") : ""}`);
  }

  // ---------------- ARCHIVE ----------------
  await go(page, "/inflight-magazine");
  const count = () => page.locator(".ed-archive__grid .ed-edition").count();
  await page.getByRole("button", { name: /^2024/ }).click();
  const c2024 = await count();
  const pressed = await page.getByRole("button", { name: /^2024/ }).getAttribute("aria-pressed");
  await page.getByRole("button", { name: /^All years/ }).click();
  const cAll = await count();
  await page.fill("#archive-search", "Kolkata");
  await page.waitForTimeout(200);
  const hits = await page.locator(".ed-archive__hit").count();
  const cSearch = await count();
  const status = await page.locator(".ed-archive__count").innerText();
  await page.fill("#archive-search", "zzzz-no-match");
  const empty = await page.locator(".ed-archive__empty").isVisible();
  await page.getByRole("button", { name: "Show all editions" }).click();
  const reset = await count();
  check("archive", w, c2024 === 8 && pressed === "true" && cAll === 29 && hits === 1 && cSearch === 1 && empty && reset === 29,
    `filter 2024 → ${c2024}, all → ${cAll}; search "Kolkata" → ${hits} story + ${cSearch} edition ("${status}"); no-match → empty state; reset → ${reset}`);
  await page.fill("#archive-search", "Kolkata");
  [p, t] = await follow(page, page.locator(".ed-archive__hit").first());
  check("archive", w, p === "/stories/travel/kolkata-forever-day-in-a-city", `search result → ${p}`);
  await go(page, "/inflight-magazine");
  [p] = await follow(page, page.locator(".ed-latest__title a"));
  check("archive", w, p === "/inflight-magazine/september-2026", `latest edition link → ${p}`);
  await go(page, "/inflight-magazine");
  [p] = await follow(page, page.locator(".ed-archive__grid .ed-edition").nth(10).locator(".ed-edition__read"));
  check("archive", w, /^\/inflight-magazine\/[a-z]+-\d{4}$/.test(p), `edition card → ${p}`);
  await go(page, "/inflight-magazine");
  const archPdf = await pdfViewer(page, page.locator(".ed-latest").getByRole("button"), SEPT_PDF);
  check("archive", w, archPdf.ok, "latest edition PDF → reader opens and closes");

  // ---------------- EDITION ----------------
  await go(page, "/inflight-magazine/september-2026");
  await page.getByRole("link", { name: /Read the stories/ }).click();
  await page.waitForTimeout(300);
  const contentsInView = await page.evaluate(() => { const r = document.getElementById("contents-title").getBoundingClientRect(); return r.top >= document.querySelector(".ed-header").getBoundingClientRect().bottom - 2 && r.top < innerHeight; });
  check("edition", w, contentsInView, `"Read the stories" → contents in view below the header`);
  [p, t] = await follow(page, page.locator(".ed-toc__link", { hasText: "The Flavour Maverick" }));
  check("edition", w, p === "/stories/interviews/ranveer-brar-conversation" && /Flavour Maverick/.test(t), `contents entry → ${p}`);
  await go(page, "/inflight-magazine/september-2026");
  [p] = await follow(page, page.locator('a[rel="prev"]').first());
  check("edition", w, p === "/inflight-magazine/august-2026", `previous edition → ${p}`);
  [p] = await follow(page, page.locator('a[rel="next"]').first());
  check("edition", w, p === "/inflight-magazine/september-2026", `next edition → ${p}`);
  const nearCard = page.locator(".ed-issue__nearby .ed-edition").first();
  [p] = await follow(page, nearCard.locator(".ed-edition__read"));
  check("edition", w, /^\/inflight-magazine\/[a-z]+-\d{4}$/.test(p) && p !== "/inflight-magazine/september-2026", `nearby edition → ${p}`);
  await go(page, "/inflight-magazine/september-2026");
  const edPdf = await pdfViewer(page, page.locator(".ed-issue__hero").getByRole("button"), SEPT_PDF);
  check("edition", w, edPdf.ok, "hero \"View Original PDF\" → reader, new-tab and download links point at the edition PDF");

  // PDF-only edition
  await go(page, "/inflight-magazine/april-2025");
  const aprilPdf = await page.evaluate(() => document.querySelector(".ed-issue__hero a[target=_blank]")?.getAttribute("href"));
  const aprilDl = await page.evaluate(() => document.querySelector(".ed-pdfpanel a[download]")?.getAttribute("href"));
  const aprilTab = await page.evaluate(() => { const a = document.querySelector(".ed-issue__hero a[target=_blank]"); return a && /noopener/.test(a.rel); });
  const aprilViewer = await pdfViewer(page, page.locator(".ed-issue__hero").getByRole("button"), aprilPdf);
  const panelViewer = await pdfViewer(page, page.locator(".ed-pdfpanel").getByRole("button"), aprilPdf);
  const pdfHead = await fetch(aprilPdf, { method: "HEAD" });
  check("edition", w, aprilViewer.ok && panelViewer.ok && aprilDl === aprilPdf && aprilTab && pdfHead.ok,
    `PDF-only: "Read this edition online" + panel reader open the PDF, new tab (noopener) and download point at it, PDF ${pdfHead.status}`);
  [p] = await follow(page, page.locator('a[rel="next"]').first());
  check("edition", w, p === "/inflight-magazine/may-2025", `PDF-only next edition → ${p}`);
  await go(page, "/inflight-magazine/february-2024");
  const oldest = await page.locator(".ed-pager__end").first().innerText();
  check("edition", w, /Oldest edition/.test(oldest), `oldest edition shows "${oldest}"`);

  // ---------------- ARTICLE ----------------
  const art = "/stories/travel/kolkata-forever-day-in-a-city";
  await go(page, art);
  const img = await page.evaluate(() => { const i = document.querySelector(".ed-article__image img"); return i && i.complete && i.naturalWidth > 0 && i.alt.length > 10; });
  check("article", w, img, "hero image loaded with alt text");
  for (const [label, sel, want] of [
    ["breadcrumb edition", '.ed-crumbs a[href="/inflight-magazine/september-2026"]', "/inflight-magazine/september-2026"],
    ["breadcrumb archive", '.ed-crumbs a[href="/inflight-magazine"]', "/inflight-magazine"],
    ["breadcrumb home", '.ed-crumbs a[href="/"]', "/"],
    ["edition pill", ".ed-story__edition a", "/inflight-magazine/september-2026"],
    ["previous story", '.ed-pager--story a[rel="prev"]', "/stories/welcome-aboard/welcome-aboard-september-2026"],
    ["next story", '.ed-pager--story a[rel="next"]', "/stories/cuisine/global-flavours-take-off"],
    ["see the whole edition", ".ed-story__issue a.btn", "/inflight-magazine/september-2026"],
    ["related story", ".ed-related .ed-card__link", null],
  ]) {
    await go(page, art);
    const loc = page.locator(sel).first();
    const href = await loc.getAttribute("href");
    [p, t] = await follow(page, loc);
    const ok = want ? p === want || p === href : p.startsWith("/stories/") && p !== art;
    check("article", w, ok && p === href, `${label} → ${p}`);
  }
  // printed order: Welcome Aboard (p2) → Kolkata (p32) → Global Flavours (p36)
  await go(page, art);
  const order = await page.evaluate(() => [document.querySelector('.ed-pager--story a[rel="prev"]')?.getAttribute("href"), document.querySelector('.ed-pager--story a[rel="next"]')?.getAttribute("href")]);
  check("article", w, order[0] === "/stories/welcome-aboard/welcome-aboard-september-2026" && order[1] === "/stories/cuisine/global-flavours-take-off", `story pager in printed order: ${order.join(" ← · → ")}`);
  await go(page, "/stories/destinations/ladakh-roof-of-the-world");
  // The lead photograph's printed caption belongs to the page-67 caption
  // block, shown once: under the hero, or with that page's photographs
  const cap = await page.evaluate(() => {
    const where = [...document.querySelectorAll(".ed-article__figure figcaption, .ed-gallery__caption")].filter((el) => /Spituk Monastery/.test(el.textContent));
    return { count: where.length, first: where[0]?.className ?? "" };
  });
  check("article", w, cap.count === 1, `photo essay lead caption printed once (${cap.count}, in ${cap.first || "nothing"})`);

  check("console", w, errors.length === 0, `console/page errors during the journeys: ${errors.length}${errors.length ? " — " + errors.slice(0, 3).join(" | ") : ""}`);
  await ctx.close();
}

await browser.close();
await fs.mkdir("screenshots", { recursive: true });
await fs.writeFile("screenshots/p5-interactions.json", JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} interaction checks pass`);
console.log(failed.length ? `${failed.length} FAILED` : "P5 INTERACTIONS: ALL PASS");
