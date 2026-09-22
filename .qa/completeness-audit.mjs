// Content-completeness audit: PDF → web.
//
// content-audit.mjs proves the web adds nothing (every web word is printed).
// This proves the reverse: nothing printed is lost. For every web article,
// every text block on its own PDF pages (read fresh from the PDF text layer)
// must either
//   - appear on the RENDERED article page (production build; textContent, so
//     text inside closed folds counts), or
//   - be explained: a folio, a running head repeated through the edition, a
//     drop-cap letter joined to its word, text of another web story sharing
//     the page, or an explicit decision in completeness-registry.mjs.
// Anything else is UNEXPLAINED LOSS and fails the audit.
//
// Usage (against `npm run build && npx next start -p 3140`):
//   PLAYWRIGHT_BROWSERS_PATH=./browsers node completeness-audit.mjs [baseUrl] [slug ...]
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright";
import { pageBlocks } from "./blocks.mjs";
import { REGISTRY } from "./completeness-registry.mjs";
import { storyHref } from "./site-urls.mjs";

const args = process.argv.slice(2);
const BASE = args[0]?.startsWith("http") ? args.shift() : "http://localhost:3140";
const ONLY = new Set(args);

// ---- data (transpiled from the site's own TypeScript) ----
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
await fs.mkdir("tmp", { recursive: true });
const load = async (name) => {
  const js = ts.transpileModule(await fs.readFile(`../src/data/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  await fs.writeFile(`tmp/completeness-${name}.mjs`, js);
  return import(pathToFileURL(`tmp/completeness-${name}.mjs`).href + `?t=${Date.now()}`);
};
const { stories } = await load("stories");

// ---- text normalisation shared by both sides ----
// Hyphens are dropped (a printed "side-|up" and a joined "sideup" compare
// equal); dashes separate words; accents and ligatures fold.
const tokens = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[*¬­-]/g, "")
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—/|•·]/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean);
const shingles = (t, n) => {
  const o = [];
  for (let i = 0; i + n <= t.length; i++) o.push(t.slice(i, i + n).join(" "));
  return o;
};

const HONORIFICS = new Set(["ms", "mr", "mrs", "dr"]);

// Can a digit string be cut into numbers that are all in `set`? ("106" → 10|6)
const splitsInto = (digits, set) => {
  if (!/^\d+$/.test(digits) || !set.size) return false;
  const ok = [true];
  for (let i = 1; i <= digits.length; i++) ok[i] = [1, 2].some((k) => i >= k && ok[i - k] && set.has(String(Number(digits.slice(i - k, i)))) && digits[i - k] !== "0");
  return Boolean(ok[digits.length]);
};

// Registry keys: "<edition>:p<page>b<n>" or a range "<edition>:p<page>b<a>-b<z>"
const registryFor = (ed, page, id, slug) => {
  const n = Number(id.split("b")[1]);
  for (const [key, entry] of Object.entries(REGISTRY)) {
    if ((entry.slug ?? slug) !== slug) continue;
    const m = key.match(/^([a-z]+-\d{4}):p(\d+)b(\d+)(?:-b(\d+))?$/);
    if (!m) throw new Error(`bad registry key ${key}`);
    if (m[1] === ed && Number(m[2]) === page && n >= Number(m[3]) && n <= Number(m[4] ?? m[3])) return entry;
  }
  return null;
};

// ---- PDF blocks ----
const docs = {};
const pageCache = {};
const doc = async (ed) =>
  (docs[ed] ??= await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${ed}.pdf`)), verbosity: 0 }).promise);
const blocksOf = async (ed, p) => (pageCache[`${ed}-${p}`] ??= await pageBlocks(await doc(ed), p));

// Running heads: the same short text printed on 3+ pages of the edition
const runningHeads = {};
const headsOf = async (ed) => {
  if (runningHeads[ed]) return runningHeads[ed];
  const d = await doc(ed);
  const seen = new Map();
  for (let p = 1; p <= d.numPages; p++) {
    for (const b of await blocksOf(ed, p)) {
      const k = tokens(b.text).join(" ");
      if (!k || k.split(" ").length > 8) continue;
      seen.set(k, (seen.get(k) ?? new Set()).add(p));
    }
  }
  return (runningHeads[ed] = new Set([...seen].filter(([, pages]) => pages.size >= 3).map(([k]) => k)));
};

// ---- rendered web text ----
const browser = await chromium.launch();
const page = await browser.newPage();
const webText = {};
for (const s of stories) {
  const res = await page.goto(`${BASE}${storyHref(s)}`, { waitUntil: "domcontentloaded" });
  if (!res || res.status() !== 200) {
    webText[s.slug] = null;
    continue;
  }
  // Every text node, space-joined: textContent would fuse neighbouring
  // elements ("1" + "AWAKE…" → "1AWAKE…"). Closed folds still count.
  webText[s.slug] = await page.$eval("main", (m) => {
    const root = m.querySelector("article") ?? m;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const out = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest("script, style, .visually-hidden")) out.push(n.nodeValue);
    return out.join(" ");
  });
}
await browser.close();

const webIndex = {};
for (const [slug, text] of Object.entries(webText)) {
  if (text === null) continue;
  const t = tokens(text);
  webIndex[slug] = { joined: ` ${t.join(" ")} `, sh: new Set(shingles(t, 4)) };
}

// Is a block's text on a web page? "present" | "partial" | "missing"
const coverageIn = (idx, t) => {
  if (!idx) return { state: "missing", ratio: 0 };
  if (t.length < 4) return { state: idx.joined.includes(` ${t.join(" ")} `) ? "present" : "missing", ratio: 0 };
  const sh = shingles(t, 4);
  const hit = sh.filter((x) => idx.sh.has(x)).length;
  const ratio = hit / sh.length;
  return { state: ratio >= 0.9 ? "present" : ratio >= 0.4 ? "partial" : "missing", ratio, lost: sh.filter((x) => !idx.sh.has(x)) };
};

// Text-layer variants of text that IS on the web page. Returns the reason, or
// null. Each is checked against the web text, never assumed.
const variantOnWeb = (idx, text, t) => {
  if (!idx) return null;
  const raw = (words) => idx.joined.includes(words.join(" ")); // no word boundaries
  const ok = (words) => words.length >= 4 && coverageIn(idx, words).state === "present";
  // a drop cap or a line-break hyphen splits the first/last word at the block edge
  if (t.length >= 5 && (ok(t.slice(1)) || ok(t.slice(0, -1)) || ok(t.slice(1, -1))))
    return "text-layer split at a drop cap or line-break hyphen; the text is on the web";
  if (t.length < 5 && t.join("").length >= 6 && raw(t))
    return "text-layer fragment of a hyphenated or drop-cap word; the text is on the web";
  // letter-spaced display type ("K E R A L A")
  if (t.length >= 3 && t.every((w) => w.length <= 3) && raw([t.join("")]))
    return "letter-spaced display type; the word is on the web";
  // the same text set twice in the text layer ("Heaven on Earth Heaven on Earth", "WebWeb")
  const half = t.length % 2 === 0 && t.slice(0, t.length / 2).join(" ") === t.slice(t.length / 2).join(" ") ? t.slice(0, t.length / 2) : null;
  const halfWord = t.length === 1 && t[0].length % 2 === 0 && t[0].slice(0, t[0].length / 2) === t[0].slice(t[0].length / 2) ? [t[0].slice(0, t[0].length / 2)] : null;
  if ((half && raw(half)) || (halfWord && raw(halfWord))) return "text set twice in the text layer; it is on the web once";
  // short labels printed on one line but set apart on the web ("DON'T MISS
  // MUST SEE EAT & SHOP" = three box headings): the line splits into runs of
  // two or more words, each on the web
  if (t.length >= 4 && t.length <= 8) {
    let i = 0;
    while (i < t.length) {
      let j = t.length;
      while (j > i + 1 && !raw(t.slice(i, j))) j--;
      if (j === i + 1) break;
      i = j;
    }
    if (i === t.length) return "separate printed labels set on one text line; each is on the web";
  }
  // a headline split into quoted parts, out of reading order
  const parts = text.split(/["“”‘’']{1,2}\s*/).map(tokens).filter((p) => p.length >= 2);
  if (parts.length >= 2 && parts.every((p) => raw(p))) return "headline parts set out of order in the text layer; each part is on the web";
  return null;
};

// ---- audit ----
const report = [];
for (const s of stories) {
  if (ONLY.size && !ONLY.has(s.slug)) continue;
  const ed = s.editionSlug;
  const idx = webIndex[s.slug];
  const heads = await headsOf(ed);
  const rows = [];
  if (!idx) {
    report.push({ slug: s.slug, edition: ed, error: "web page not found", rows });
    continue;
  }
  const siblings = stories.filter((o) => o.editionSlug === ed && o.slug !== s.slug);
  const sectionNumbers = new Set(s.body.filter((b) => b.type === "subhead" && b.number !== undefined).map((b) => String(b.number)));
  for (const p of s.source.pdfPages) {
    for (const b of await blocksOf(ed, p)) {
      const t = tokens(b.text);
      if (!t.length) continue;
      const key = `${ed}:${b.id}`;
      const row = { id: b.id, text: b.text.replace(/¬/g, "-").slice(0, 140) };
      const cov = coverageIn(idx, t);
      const reg = registryFor(ed, p, b.id, s.slug);
      const bylineWords = new Set(tokens(`${s.author ?? ""} ${s.role ?? ""} ${s.bylineLabel ?? ""}`));
      const honorifics = t.filter((w) => HONORIFICS.has(w) && !bylineWords.has(w));
      if (cov.state === "present") row.status = "present";
      else if (reg) {
        row.status = "explained";
        row.why = reg.why;
      } else if (s.author && tokens(s.author).every((w) => t.includes(w)) && t.every((w) => bylineWords.has(w) || honorifics.includes(w))) {
        // printed byline in its printed order (e.g. "CHEF NISHANT CHOUBEY");
        // the web shows "By <author>, <role>"
        row.status = "explained";
        row.why = `printed byline, shown on the web as the byline and role${honorifics.length ? ` (web omits the honorific "${honorifics.join(" ")}")` : ""}`;
      } else if (b.size >= 20 && splitsInto(t.join(""), sectionNumbers)) {
        // the large printed stop/section numbers, which the text layer sets
        // as one block ("2 3", or "106" = 10 and 6)
        row.status = "explained";
        row.why = "printed section numbers — each is shown on its web subhead";
      } else if (variantOnWeb(idx, b.text, t)) {
        row.status = "explained";
        row.why = variantOnWeb(idx, b.text, t);
      } else if (/^\d{1,3}$/.test(t.join("")) && ((b.y < 40 || b.y > 800) || s.source.printedPages.includes(Number(t.join(""))))) {
        // a page number: in the margin, or the story's own printed folio
        row.status = "explained";
        row.why = "folio";
      } else if (heads.has(t.join(" "))) {
        row.status = "explained";
        row.why = "running head";
      } else if (t.length === 1 && t[0].length === 1 && b.size >= 20) {
        row.status = "explained";
        row.why = "drop-cap letter (set as the first letter of its word on the web)";
      } else {
        const other = siblings.find((o) => o.source.pdfPages.includes(p) && coverageIn(webIndex[o.slug], t).state === "present");
        if (other) {
          row.status = "explained";
          row.why = `printed with another web story: ${other.slug}`;
        } else {
          row.status = cov.state === "partial" ? "PARTIAL" : "MISSING";
          if (cov.state === "partial") row.lost = cov.lost.slice(0, 6);
          row.ratio = +cov.ratio.toFixed(2);
        }
      }
      rows.push({ page: p, ...row });
    }
  }
  report.push({ slug: s.slug, edition: ed, pdfPages: s.source.pdfPages, rows });
}

await fs.mkdir("screenshots", { recursive: true });
await fs.writeFile("screenshots/completeness-audit.json", JSON.stringify(report, null, 1));

let unexplained = 0;
for (const r of report) {
  if (r.error) {
    unexplained++;
    console.log(`FAIL ${r.slug}: ${r.error}`);
    continue;
  }
  const bad = r.rows.filter((x) => x.status === "MISSING" || x.status === "PARTIAL");
  const explained = r.rows.filter((x) => x.status === "explained").length;
  const present = r.rows.filter((x) => x.status === "present").length;
  unexplained += bad.length;
  console.log(`${bad.length ? "FAIL" : "PASS"} ${r.slug.padEnd(46)} blocks ${String(r.rows.length).padStart(3)} | on web ${String(present).padStart(3)} | explained ${String(explained).padStart(2)} | unexplained ${bad.length}`);
  for (const x of bad) console.log(`     ${x.status} ${r.edition}:${x.id} (${x.ratio}) "${x.text}"${x.lost ? ` — lost: ${x.lost.join(" / ")}` : ""}`);
}
console.log(unexplained ? `\n${unexplained} UNEXPLAINED BLOCK(S) — see screenshots/completeness-audit.json` : "\nCOMPLETENESS AUDIT: 0 unexplained content loss");
process.exitCode = unexplained ? 1 : 0;
