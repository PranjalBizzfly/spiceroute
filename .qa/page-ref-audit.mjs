// Verifies that no printed/PDF page-number label is visible in the UI.
//
// Renders every route, opens every fold, and reads all text nodes. A match
// inside source-exact printed text (the article, the printed pages around it,
// printed captions) is CONTENT and is kept — printed copy may legitimately say
// "see page 41". Anything else is a UI label and fails.
//
// Usage: PLAYWRIGHT_BROWSERS_PATH=./browsers node page-ref-audit.mjs [base]
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3141";
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname))];
routes.push("/search", "/search?q=kolkata", "/no-such-page");

// The wordings the UI used to print, each tied to a number
const PATTERNS = [
  /\bprinted\s+pages?\b[^.]{0,12}\d/i, // "Printed page 33", "Printed pages 32–34"
  /\bpdf\s+pages?\s*\d/i, //              "PDF page 34"
  /\bpages?\s+\d+(\s*[–—-]\s*\d+)?\s+in\s+print\b/i, // "Pages 34–35 in print"
  /(^|[\s·|(])p\.\s*\d{1,3}\b/i, //       "p. 33"
  /[·|]\s*pages?\s*\d/i, //               "· page 33"
  /\bpages?\s+\d{1,3}\b/i, //             a bare "page 33" / "pages 32 34"
  /\b\d{1,3}\s+pages\b/i, //              an edition page count, "84 pages"
  /\bin\s+print\b/i, //                   "84 pages in print", "Pages in print"
  /\bas\s+printed\b/i, //                 "as printed", "word for word as printed"
  /\bprinted\s+(order|page|pages)\b/i, // "in printed order", "printed page"
];
// Nothing is whitelisted: the ruling is that edition page counts and the
// "in print" framing go as well as the page pointers.
const ALLOWED = [];
// Source-exact printed text: matches here are the magazine's own words
const CONTENT = ".ed-article, .ed-extra, .ed-pagefeat, .ed-lightbox__captions, .ed-gallery__captions";

const browser = await chromium.launch();
let ui = 0, content = 0;
for (const width of [1280, 390]) {
const ctx = await browser.newContext({ viewport: { width, height: 900 } });
const page = await ctx.newPage();
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  const texts = await page.evaluate((CONTENT) => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest("script, style")) continue;
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (!t) continue;
      out.push({ t, where: `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`, isContent: Boolean(el.closest(CONTENT)) });
    }
    return out;
  }, CONTENT);
  for (const { t, where, isContent } of texts) {
    if (ALLOWED.some((a) => a.test(t)) || !PATTERNS.some((re) => re.test(t))) continue;
    if (isContent) { content++; if (process.env.VERBOSE) console.log(`content ${r} [${where}]: "${t.slice(0, 80)}"`); continue; }
    ui++;
    console.log(`FAIL ${width} ${r} [${where}]: "${t.slice(0, 120)}"`);
  }
}
await ctx.close();
}

// Interactive states: a label can live only in an opened dialog (the lightbox
// caption header did), which a page-load sweep never reaches.
const ictx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const ipage = await ictx.newPage();
let opened = 0;
for (const r of routes.filter((r) => r.startsWith("/stories/") && r.split("/").length > 3)) {
  await ipage.goto(BASE + r, { waitUntil: "domcontentloaded" });
  const shot = ipage.locator("button.ed-gallery__item").first();
  if (!(await shot.count())) continue;
  await shot.click({ force: true }).catch(() => {});
  const dialog = ipage.locator(".ed-lightbox, [role=dialog]").first();
  if (!(await dialog.count()) || !(await dialog.isVisible().catch(() => false))) continue;
  opened++;
  const texts = await dialog.evaluate((d, CONTENT) => {
    const out = [];
    const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest("script, style")) continue;
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t) out.push({ t, where: `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`, isContent: Boolean(el.closest(CONTENT)) });
    }
    for (const el of d.querySelectorAll("[aria-label], [title]"))
      out.push({ t: `${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""}`.trim(), where: `${el.tagName.toLowerCase()}[label]`, isContent: false });
    return out;
  }, CONTENT);
  for (const { t, where, isContent } of texts) {
    if (ALLOWED.some((a) => a.test(t)) || !PATTERNS.some((re) => re.test(t))) continue;
    if (isContent) { content++; continue; }
    ui++;
    console.log(`FAIL lightbox ${r} [${where}]: "${t.slice(0, 120)}"`);
  }
  await ipage.keyboard.press("Escape").catch(() => {});
}
await ictx.close();
await browser.close();
// A selector that opens nothing and a state that is clean look identical, so
// reaching zero interactive states is a failure, not a pass.
if (!opened) {
  console.log("FAIL no lightbox was opened: the interactive pass checked nothing (selector or hydration broken)");
  ui++;
}
console.log(ui
  ? `\n${ui} problem(s): page-number labels still visible, or the audit could not check a state`
  : `\nPAGE-REF AUDIT: CLEAN — ${routes.length} routes, no page-number labels in the UI (${content} matches inside printed text, kept; 1280 and 390, plus ${opened} opened lightboxes)`);
process.exit(ui ? 1 : 0);
