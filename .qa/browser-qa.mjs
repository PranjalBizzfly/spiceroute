// Real-browser visual QA (Chromium via Playwright) against the local
// production server. Screenshots + measured layout problems per viewport.
// Usage: node browser-qa.mjs [baseUrl]
import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3123";
const VIEWPORTS = [
  [320, 800], [360, 800], [390, 844], [414, 896], [430, 932],
  [768, 1024], [820, 1180], [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
];
const EDITION = "/inflight-magazine/september-2026";
const ARTICLES = {
  interview: "/stories/interviews/ranveer-brar-conversation",
  itinerary: "/stories/travel/kolkata-forever-day-in-a-city",
  photoessay: "/stories/destinations/ladakh-roof-of-the-world",
  pullquotes: "/stories/wellness/fur-all-pet-yoga",
};
const SHOTS = "screenshots";

// ---------- in-page probes ----------
const probe = () => {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const txt = (el.innerText || el.getAttribute("alt") || "").trim().replace(/\s+/g, " ").slice(0, 50);
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${txt ? ` "${txt}"` : ""}`;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && el.getClientRects().length > 0;
  };
  // Is the element legitimately contained by a scroll/clip ancestor that itself fits?
  const containedByScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) {
        const r = p.getBoundingClientRect();
        if (r.left >= -1 && r.right <= vw + 1) return true;
      }
    }
    return false;
  };

  const overflow = [];
  const textOverflow = [];
  const tinyText = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if ((r.right > vw + 1 || r.left < -1) && !containedByScroller(el)) {
      overflow.push(`${describe(el)} [${Math.round(r.left)}→${Math.round(r.right)} of ${vw}]`);
    }
    const cs = getComputedStyle(el);
    if (/^(H[1-6]|P|A|BUTTON|SPAN|LI|DT|DD|BLOCKQUOTE)$/.test(el.tagName) && cs.overflowX === "visible" && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.display !== "inline") {
      textOverflow.push(`${describe(el)} [scroll ${el.scrollWidth} > box ${el.clientWidth}]`);
    }
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasOwnText && parseFloat(cs.fontSize) < 11 && !el.closest(".visually-hidden")) tinyText.add(`${describe(el)} (${cs.fontSize})`);
  }

  const images = [...document.images].filter((img) => !img.closest(".ed-issue__ambient")).filter(visible).map((img) => {
    const r = img.getBoundingClientRect();
    const fit = getComputedStyle(img).objectFit;
    const nat = img.naturalWidth / (img.naturalHeight || 1);
    const box = r.width / (r.height || 1);
    const shown = Math.min(box / nat, nat / box); // share of the image visible under cover-fit
    return { src: decodeURIComponent(img.currentSrc || img.src).replace(/^.*url=/, "").split("&")[0], w: Math.round(r.width), h: Math.round(r.height), nw: img.naturalWidth, nh: img.naturalHeight, complete: img.complete, fit, distortion: fit === "fill" ? Math.abs(box - nat) / nat : 0, shown };
  });

  return {
    vw,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: overflow.slice(0, 25),
    overflowCount: overflow.length,
    textOverflow: textOverflow.slice(0, 15),
    tinyText: [...tinyText].slice(0, 15),
    brokenImages: images.filter((i) => i.complete && i.nw === 0).map((i) => i.src),
    distortedImages: images.filter((i) => i.distortion > 0.03).map((i) => `${i.src} ${i.w}x${i.h} vs ${i.nw}x${i.nh}`),
    heavilyCropped: images.filter((i) => i.fit === "cover" && i.nw > 0 && i.shown < 0.5).map((i) => `${i.src} box ${i.w}x${i.h} shows ${(i.shown * 100).toFixed(0)}%`),
    stuckHidden: [...document.querySelectorAll('.ed-reveal[data-armed="true"]:not(.is-visible)')].filter((e) => getComputedStyle(e).opacity !== "1").length,
    header: (() => {
      const h = document.querySelector(".ed-header");
      const bar = document.querySelector(".ed-header__bar");
      const nav = document.querySelector(".ed-header__nav");
      const toggle = document.querySelector(".ed-header__toggle");
      return { height: Math.round(h?.getBoundingClientRect().height ?? 0), barHeight: Math.round(bar?.getBoundingClientRect().height ?? 0), navVisible: nav ? visible(nav) : false, toggleVisible: toggle ? visible(toggle) : false };
    })(),
  };
};

async function settle(page) {
  // Scroll the whole page so lazy images load and every reveal fires.
  // The site uses scroll-behavior: smooth, so jumps must be explicitly
  // instant or each one is cancelled by the next and the page never moves.
  await page.evaluate(async () => {
    const step = Math.max(300, innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(900);
}

async function sectionShot(page, selector, file) {
  const el = page.locator(selector).first();
  if (!(await el.count())) return `missing ${selector}`;
  await el.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.waitForTimeout(900); // let reveal transitions finish
  await el.screenshot({ path: file, animations: "disabled" });
  return file;
}

const browser = await chromium.launch();
const report = [];
await fs.rm(SHOTS, { recursive: true, force: true });

for (const [w, h] of VIEWPORTS) {
  const dir = `${SHOTS}/${w}x${h}`;
  await fs.mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 160)}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url().slice(0, 140)}`));
  const entry = { viewport: `${w}x${h}`, pages: {}, checks: {} };

  // ---------- Homepage ----------
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1200); // hero entrance settles (~0.7s)
  await page.screenshot({ path: `${dir}/home-01-top.png` });
  await settle(page);
  entry.pages.home = await page.evaluate(probe);
  const sections = [
    ["home-02-letter", "section[aria-label='Welcome Aboard']"],
    ["home-03-featured", "section[aria-labelledby='featured-title']"],
    ["home-04-latest", "section[aria-labelledby='latest-title']"],
    ["home-05-travel", "section[aria-labelledby='travel-title']"],
    ["home-06-food", "section[aria-labelledby='food-title']"],
    ["home-07-culture", "section[aria-labelledby='culture-title']"],
    ["home-08-editions", "section[aria-labelledby='editions-title']"],
    ["home-09-about", "section[aria-labelledby='about-title']"],
    ["home-10-advertise", "section[aria-labelledby='advertise-title']"],
    ["home-11-footer", "footer"],
  ];
  for (const [name, sel] of sections) await sectionShot(page, sel, `${dir}/${name}.png`);

  // Mobile navigation (below the 960px desktop breakpoint)
  if (w < 960) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const toggle = page.locator(".ed-header__toggle");
    entry.checks.drawerHiddenBeforeOpen = !(await page.locator("#mobile-navigation").isVisible());
    await toggle.click();
    await page.waitForTimeout(350);
    const drawer = page.locator("#mobile-navigation");
    const box = await drawer.boundingBox();
    const links = await drawer.locator("a").evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return { t: a.innerText.trim(), bottom: Math.round(r.bottom), right: Math.round(r.right), h: Math.round(r.height) }; }));
    entry.checks.mobileNav = {
      opened: await drawer.isVisible(),
      ariaExpanded: await toggle.getAttribute("aria-expanded"),
      bodyScrollLocked: await page.evaluate(() => document.body.style.overflow === "hidden"),
      drawerFitsWidth: box ? box.x >= 0 && box.x + box.width <= w + 1 : false,
      linksOutsideViewport: links.filter((l) => l.bottom > h || l.right > w + 1).map((l) => l.t),
      smallTapTargets: links.filter((l) => l.h < 40).map((l) => `${l.t} (${l.h}px)`),
    };
    await page.screenshot({ path: `${dir}/nav-open.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    entry.checks.mobileNav.escapeCloses = !(await drawer.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "false";
    await toggle.click();
    await page.waitForTimeout(250);
    await drawer.getByRole("link", { name: "About" }).click();
    await page.waitForURL("**/about");
    await page.waitForTimeout(300);
    entry.checks.mobileNav.closesOnNavigate = !(await page.locator("#mobile-navigation").isVisible());
    entry.checks.mobileNav.landedOn = new URL(page.url()).pathname;
  } else {
    entry.checks.desktopNav = {
      ...entry.pages.home.header,
      drawerHidden: !(await page.locator("#mobile-navigation").isVisible()),
    };
  }

  // PDF viewer (homepage edition card)
  if ([390, 1440].includes(w)) {
    await page.goto(BASE + "/", { waitUntil: "load" });
    await settle(page);
    const btn = page.getByRole("button", { name: /View Original PDF/ }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 5000 });
    const iframeSrc = await dialog.locator("iframe").getAttribute("src");
    await page.screenshot({ path: `${dir}/pdf-viewer-open.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    entry.checks.pdfViewer = {
      opened: true,
      iframeSrc,
      escapeCloses: !(await dialog.isVisible()),
      focusReturned: await page.evaluate(() => document.activeElement?.textContent?.includes("View Original PDF") ?? false),
      bodyUnlocked: await page.evaluate(() => document.body.style.overflow === ""),
    };
  }

  // ---------- Edition page ----------
  await page.goto(BASE + EDITION, { waitUntil: "load" });
  await page.screenshot({ path: `${dir}/edition-01-top.png` });
  await settle(page);
  entry.pages.edition = await page.evaluate(probe);
  await sectionShot(page, "#in-this-issue", `${dir}/edition-02-contents.png`);

  // ---------- Article pages (one per printed structure) ----------
  for (const [kind, path] of Object.entries(ARTICLES)) {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/article-${kind}-01-top.png` });
    await settle(page);
    entry.pages[`article-${kind}`] = await page.evaluate(probe);
    const bodyEl = page.locator(".ed-article");
    if (await bodyEl.count()) {
      await bodyEl.evaluate((n) => n.scrollIntoView({ block: "start", behavior: "instant" }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${dir}/article-${kind}-02-body.png` });
    }
  }

  entry.errors = [...new Set(errors)].slice(0, 20);
  report.push(entry);
  await context.close();
  console.log(`done ${w}x${h}`);
}

// Reduced-motion pass: everything must be visible with animation disabled
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  report.push({
    viewport: "390x844 reduced-motion",
    armedRevealElements: await page.locator('.ed-reveal[data-armed="true"]').count(),
    heroAnimationName: await page.locator(".ed-hero__title").evaluate((el) => getComputedStyle(el).animationName),
  });
  await context.close();
}

await browser.close();
await fs.writeFile(`${SHOTS}/report.json`, JSON.stringify(report, null, 1));
console.log(`report: ${SHOTS}/report.json`);
