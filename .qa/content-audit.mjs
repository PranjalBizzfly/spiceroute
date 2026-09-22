// Independent content-integrity audit of src/data/stories.ts against the PDFs.
// Deliberately does NOT reuse the builder's block logic: it reads each
// article's own pages straight from the PDF text layer and checks that the
// site's text is found there.
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const load = async (name) => {
  const js = ts.transpileModule(await fs.readFile(`../src/data/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  await fs.writeFile(`tmp/audit-${name}.mjs`, js);
  return import(pathToFileURL(`tmp/audit-${name}.mjs`).href + `?t=${Date.now()}`);
};
const { stories } = await load("stories");
const { editions } = await load("editions");

const docs = {};
const pageItems = async (edition, n) => {
  docs[edition] ??= await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
  return (await (await docs[edition].getPage(n)).getTextContent()).items.filter((i) => i.str.trim());
};

const tokens = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // "Appétit" set in caps as "APPETIT"
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”"]/g, " ")
    .replace(/[–—\-/]/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/'(?=\s|$)|(^|\s)'/g, " ")
    .split(/\s+/)
    .filter(Boolean);

// Letters printed as artwork (not in the text layer), each verified on the
// page render during the build. Listed explicitly, never silently ignored.
const ARTWORK_WORDS = {
  "live-long-travel-longer": { once: "drop cap O is a palm-tree illustration (july-2026-p52.png)" },
};

const FABRICATED = [/kitten/i, /1902/, /pathiri/i, /sulaimani/i, /rufous/i, /alphonso/i, /kaziranga/i, /always lucknow\.?\s*your favourite/i];
const report = [];
// Details once invented by an earlier version of the site: a fail only where a
// story carries one that its own printed pages do not (Kaziranga, for
// example, is genuinely printed in later issues)
const unprintedHits = new Map(FABRICATED.map((re) => [re, []]));

for (const s of stories) {
  const problems = [];
  const ed = editions.find((e) => e.slug === s.editionSlug);
  if (!ed) problems.push("edition missing");
  if (s.source.edition !== s.editionSlug) problems.push("source.edition ≠ editionSlug");
  if (ed && ed.title !== s.editionTitle) problems.push("editionTitle mismatch");
  if (!s.source.pdfPages.includes(s.source.imagePdfPage)) problems.push("image page not among article pages");
  // "PDF page 46", or "PDF pages 46–47" for a photograph across a spread
  // (pieces printed without a photograph, e.g. Predictions, have none)
  if (s.heroImage) {
    const heroPages = s.heroImageSource?.match(/PDF pages? (\d+)(?:–(\d+))?$/);
    if (!heroPages || Number(heroPages[1]) !== s.source.imagePdfPage) problems.push("heroImageSource page ≠ imagePdfPage");
    else if (heroPages[2] && !s.source.pdfPages.includes(Number(heroPages[2]))) problems.push("hero spread page not among article pages");
    try { await fs.access(`../public${s.heroImage}`); } catch { problems.push("image file missing"); }
  }
  // Gallery photographs: files exist, pages belong to the article, alt text set
  for (const g of s.gallery ?? []) {
    try { await fs.access(`../public${g.src}`); } catch { problems.push(`gallery file missing ${g.src}`); }
    if (!g.pdfPages.every((p) => s.source.pdfPages.includes(p))) problems.push(`gallery ${g.src} not on article pages`);
    if (!g.alt?.trim()) problems.push(`gallery ${g.src} has no alt`);
  }
  for (const c of s.printedCaptions ?? []) {
    if (!s.source.pdfPages.includes(c.pdfPage)) problems.push(`caption on p${c.pdfPage} not on article pages`);
  }

  // Page text of THIS article's pages only
  let items = [];
  for (const p of s.source.pdfPages) items = items.concat((await pageItems(s.editionSlug, p)).map((i) => ({ ...i, page: p })));
  const pageText = items.map((i) => i.str).join(" ");
  const pageTok = tokens(pageText);
  const tokSet = new Set(pageTok);
  for (let i = 0; i + 1 < pageTok.length; i++) {
    tokSet.add(pageTok[i] + pageTok[i + 1]); // split words / drop caps
    tokSet.add(pageTok[i] + "'" + pageTok[i + 1]); // "What" "'" "s More" set as separate items
    if (pageTok[i + 2]) tokSet.add(pageTok[i] + pageTok[i + 1] + pageTok[i + 2]); // kerned "I" "ma" "gine"
  }
  // a drop cap placed elsewhere in the content stream: its single letter
  // is printed on these pages and the rest of the word follows in the text
  const letters = new Set(pageTok.filter((w) => w.length === 1));
  for (const w of pageTok) for (const l of letters) tokSet.add(l + w);

  for (const re of FABRICATED) {
    if (re.test(JSON.stringify(s)) && !re.test(pageText)) unprintedHits.get(re).push(s.slug);
  }

  // Printed folios on those pages must equal source.printedPages (spread
  // editions: PDF page p holds printed pages 2p-2 and 2p-1)
  for (const [k, p] of s.source.pdfPages.entries()) {
    const folio = (await pageItems(s.editionSlug, p)).filter((i) => i.transform[5] < 26 && /^\d{1,3}$/.test(i.str.trim())).map((i) => Number(i.str));
    if (s.source.spreads) {
      const own = folio.filter((n) => n === 2 * p - 2 || n === 2 * p - 1);
      if (!own.length && folio.length) problems.push(`PDF p${p}: printed folios ${folio.join("/")} are not pages ${2 * p - 2}/${2 * p - 1}`);
      if (!s.source.printedPages.some((n) => n === 2 * p - 2 || n === 2 * p - 1)) problems.push(`PDF p${p}: none of its printed pages recorded`);
    } else if (folio.length && !folio.includes(s.source.printedPages[k])) problems.push(`PDF p${p}: printed folio ${folio.join("/")} ≠ recorded ${s.source.printedPages[k]}`);
  }

  // Byline, role and printed section must be printed on the pages
  const printed = (v) => tokens(v).every((w) => tokSet.has(w));
  if (s.author && !printed(s.author)) problems.push(`author "${s.author}" not printed`);
  if (s.role && !printed(s.role)) problems.push(`role "${s.role}" not printed`);
  if (s.source.sectionPdfPage) {
    // section running head printed on the facing page only
    const facing = new Set(tokens((await pageItems(s.editionSlug, s.source.sectionPdfPage)).map((i) => i.str).join(" ")));
    if (!tokens(s.section).every((w) => facing.has(w))) problems.push(`section "${s.section}" not printed on facing page`);
  } else if (!printed(s.section)) problems.push(`section "${s.section}" not printed`);
  if (s.label && !printed(s.label)) problems.push(`label "${s.label}" not printed`);

  // Every word of the site text must occur on the article's pages
  const siteParts = [
    ["excerpt", s.excerpt],
    ...s.body.map((b, i) => [`body[${i}]`, b.text ?? b.items.join(" ")]),
    ...(s.pullQuotes ?? []).map((q, i) => [`pullQuote[${i}]`, q]),
    ...(s.callouts ?? []).map((c, i) => [`callout[${i}]`, c]),
    ...(s.heroImageCaption ? [["caption", s.heroImageCaption]] : []),
    ...(s.printedCaptions ?? []).flatMap((c, i) => [
      ...(c.label ? [[`printedCaption[${i}].label`, c.label]] : []),
      ...c.items.map((t, j) => [`printedCaption[${i}][${j}]`, t]),
    ]),
  ];
  const missingWords = new Set();
  let words = 0;
  const artwork = ARTWORK_WORDS[s.slug] ?? {};
  const artworkUsed = [];
  for (const [, text] of siteParts)
    for (const w of tokens(text)) {
      words++;
      if (tokSet.has(w)) continue;
      if (artwork[w]) artworkUsed.push(`${w}: ${artwork[w]}`);
      else missingWords.add(w);
    }

  // 5-word phrase coverage (flow-order independent)
  const shingles = (arr) => { const o = []; for (let i = 0; i + 5 <= arr.length; i++) o.push(arr.slice(i, i + 5).join(" ")); return o; };
  const pageSh = new Set(shingles(pageTok));
  let total = 0, found = 0;
  for (const [, text] of siteParts) { const sh = shingles(tokens(text)); total += sh.length; found += sh.filter((x) => pageSh.has(x)).length; }
  const coverage = total ? found / total : 1;

  // Title words (artwork letters were verified from renders during build)
  const titleMissing = tokens(s.title).filter((w) => !tokSet.has(w));

  report.push({
    area: "article",
    ok: problems.length === 0 && missingWords.size === 0,
    slug: s.slug,
    title: s.title,
    section: s.section,
    author: s.author ?? null,
    role: s.role ?? null,
    pdf: s.source.pdf,
    pdfPages: s.source.pdfPages,
    printedPages: s.source.printedPages,
    imagePdfPage: s.source.imagePdfPage,
    words,
    wordsNotOnPages: [...missingWords],
    phraseCoverage: +(coverage * 100).toFixed(1),
    titleWordsNotInTextLayer: titleMissing,
    artworkVerified: [...new Set(artworkUsed)],
    problems,
  });
}
for (const [re, slugs] of unprintedHits) {
  report.push({ area: "known-fabrications", ok: slugs.length === 0 || null, detail: `${re} ${slugs.length ? `FOUND unprinted in ${slugs.join(", ")}` : "absent (or printed on the story's own pages)"}` });
}

await fs.writeFile("screenshots/content-audit.json", JSON.stringify(report, null, 1));
for (const r of report.filter((x) => x.area === "known-fabrications")) console.log(`${r.ok ? "PASS" : "FAIL"} fabricated detail ${r.detail}`);
console.log("");
for (const r of report.filter((x) => x.area === "article")) {
  console.log(
    `${r.ok ? "PASS" : "FAIL"} ${r.slug.padEnd(44)} words ${String(r.words).padStart(4)} | coverage ${String(r.phraseCoverage).padStart(5)}% | pdf p${r.pdfPages.join(",")} → printed ${r.printedPages.join(",")}` +
      (r.wordsNotOnPages.length ? ` | NOT ON PAGES: ${r.wordsNotOnPages.join(", ")}` : "") +
      (r.titleWordsNotInTextLayer.length ? ` | title artwork: ${r.titleWordsNotInTextLayer.join(", ")}` : "") +
      (r.artworkVerified.length ? ` | artwork letter: ${r.artworkVerified.join("; ")}` : "") +
      (r.problems.length ? ` | ${r.problems.join("; ")}` : "")
  );
}
const fails = report.filter((r) => r.ok === null || r.ok === false);
console.log(fails.length ? `\n${fails.length} FAILED` : "\nCONTENT AUDIT: ALL PASS");
