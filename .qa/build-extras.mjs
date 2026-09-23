// Everything printed in an edition that is not an article's own text:
// advertising, 'In Focus' advertorials, SpiceJet service and menu pages,
// contents and cover pages, reader pages and single-page features.
//
// Each printed page becomes one "extra", carrying its printed text in reading
// order and its printed pictures, and is attached to the nearest article of
// the same edition, so nothing in the PDF is left off the website.
//
// Usage: node build-extras.mjs        -> src/data/extras.ts + public/images/extras/**
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "./blocks.mjs";
import { REGISTRY } from "./completeness-registry.mjs";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const sharp = require("../node_modules/sharp");

const MAX_W = 1200;
/** Pictures smaller than this are page furniture (logos, icons, rules). */
// Blank margin around a picture cut from a page: trimmed off, unless doing so
// would leave less than TRIM_FLOOR on a side.
const TRIM_THRESHOLD = 12;
const TRIM_FLOOR = 40;
/*
 * Two things the PDF text layer does to a printed line, undone so the line
 * reads as it was printed.
 *
 * Display lettering is set a character at a time, so the layer hands back
 * "C H A R T E R". The letters are rejoined only when every token on the line
 * is a single letter: a line that mixes letters with fragments, such as
 * "I N F L I G H T M AG A Z I N E", is left exactly as printed, because
 * closing those gaps would be guessing at where the words divide.
 *
 * A phrase stamped twice over reaches the layer doubled: "KhushiKhushi", or a
 * whole heading run again word for word. It is kept once. Ordinary repetition
 * in prose — "that that", "had had", "New York, New York" — is left alone: a
 * doubling only counts when the phrase repeats with nothing between it, or
 * when what repeats is long enough to be a stamped line rather than a word.
 */
const rejoinLetters = (t) => {
  const parts = t.split(" ").filter(Boolean);
  return parts.length >= 3 && parts.every((x) => x.length === 1 && /[A-Za-z]/.test(x)) ? parts.join("") : t;
};

const REPEAT_TIGHT = /^(.{4,}?)\1+$/; // no gap: "KhushiKhushi"
const REPEAT_SPACED = /^(.{12,}?)(?:\s+\1)+$/; // a whole line stamped again

const undouble = (t) => {
  const tight = REPEAT_TIGHT.exec(t);
  if (tight) return tight[1].trim();
  const spaced = REPEAT_SPACED.exec(t);
  return spaced ? spaced[1].trim() : t;
};

const asPrinted = (t) => undouble(rejoinLetters(t));

const MIN_PIXELS = 190;
/** Below this variation a picture is a flat field of colour cut from the page
    background, not a printed picture. */
const MIN_STDEV = 6;
/** Below this share of ink a picture is a blank page fragment, not a picture. */
const MIN_INK = 0.03;
const MIN_WORDS = 8; // a page with less printed text than this carries only furniture

const load = async (name) => {
  const js = ts.transpileModule(await fs.readFile(`../src/data/${name}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  await fs.writeFile(`tmp/extras-${name}.mjs`, js);
  return import(pathToFileURL(`tmp/extras-${name}.mjs`).href + `?t=${Date.now()}`);
};

/**
 * Some pages are set in fonts whose text layer carries no real characters, so
 * the "text" extracts as gibberish. Those lines are left out — the page's
 * pictures are still shown — rather than published as nonsense.
 */
function unreadable(text) {
  const letters = [...text].filter((c) => /\S/.test(c));
  if (!letters.length) return true;
  // a glyph the font does not map, or a stray control character: the line
  // cannot be reproduced faithfully, so it is left to the page's picture
  if (/[�\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) return true;
  // text shifted by a font's private encoding: "April 2024" comes out of the
  // text layer as "$SULO2024" and "March 2024" as "0DUFK2024" — letters glued
  // to a year, opening with a symbol or digit where a letter belongs
  // (@handles, #tags and /urls are printed as they stand and are kept)
  if (/(^|\s)[^A-Za-z\s@#/][A-Za-z]{3,}\u0003?(19|20)\d{2}(?=\s|$)/.test(text)) return true;
  // any letter outside plain Latin-1 counts: these pages substitute glyphs
  // from modifier-letter, Greek, Cyrillic and Indic ranges for ordinary text
  const odd = letters.filter((c) => c.codePointAt(0) > 0x024f).length;
  return odd / letters.length > 0.05;
}

/** Magazine furniture: the running head and the printed folio. */
const isFurniture = (b) => /^(spiceroute|spice route)$/i.test(b.text.trim()) || /^\d{1,3}$/.test(b.text.trim());

/** What kind of page this is, from its own printed words. */
function classify(text) {
  const t = text.toLowerCase();
  if (/\bin focus\b/.test(t)) return { kind: "advertorial", label: "In Focus" };
  if (/table of contents|^contents\b|\bvol\. ?no|publisher|editorial team|printed at|rni |all rights reserved/.test(t)) return { kind: "masthead", label: "From the printed edition" };
  if (/be in the spotlight|photo by|world photography day/.test(t)) return { kind: "readers", label: "From our readers" };
  if (/spicejet|spicexpress|spice ?club|spicelock|spiceflex|spicemax|spicecaf|spice star|friends & family|web check-?in|baggage|boarding|route map|fleet|cargo|charter|haj|mid-air feast|cup noodles|multigrain bread|combo|beverage/.test(t)) return { kind: "spicejet", label: "SpiceJet" };
  if (/www\.|\.com|\.in\b|call |toll ?free|admissions|disclaimer|terms|t&c|subject to market risk|prospectus|offer document|scan|follow us/.test(t)) return { kind: "advert", label: "Advertisement" };
  return { kind: "page", label: "From the printed edition" };
}

const { stories } = await load("stories");
const editions = [...new Set(stories.map((s) => s.editionSlug))];

/** Printed-page number for a PDF page, from the stories that carry both. */
function printedFor(edition, pdfPage) {
  const near = stories
    .filter((s) => s.editionSlug === edition && s.source.printedPages.length === s.source.pdfPages.length)
    .flatMap((s) => s.source.pdfPages.map((p, i) => [p, s.source.printedPages[i]]))
    .sort((a, b) => Math.abs(a[0] - pdfPage) - Math.abs(b[0] - pdfPage))[0];
  return near ? near[1] + (pdfPage - near[0]) : undefined;
}

const out = {};
const seen = new Map();
let units = 0;
let pictures = 0;

for (const edition of editions) {
  const own = stories.filter((s) => s.editionSlug === edition);
  const used = new Set(own.flatMap((s) => s.source.pdfPages));
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
  const index = JSON.parse(await fs.readFile(`extract/img/${edition}/index.json`, "utf8").catch(() => "[]"));
  const imagesOf = (page) => (Array.isArray(index) ? index : []).filter((i) => i.page === page);

  // Which extracted pictures an article already shows, so none is repeated
  const shown = new Set(own.flatMap((s) => (s.images ?? []).map((i) => i.src.split("/").pop().replace(/\.webp$/, ""))));

  for (let page = 1; page <= doc.numPages; page++) {
    let blocks;
    if (used.has(page)) {
      // a page an article uses: only its registered non-article matter (adverts and the like)
      const ranges = Object.entries(REGISTRY).filter(([k, v]) => k.startsWith(`${edition}:p${page}b`) && /advert|in focus|spotlight|charters|visa|customer-relations|csr|reader/i.test(v.why));
      if (!ranges.length) continue;
      const all = await pageBlocks(doc, page);
      const ids = new Set();
      for (const [key] of ranges) {
        const m = key.match(/p(\d+)b(\d+)(?:-b(\d+))?$/);
        const [from, to] = [Number(m[2]), m[3] ? Number(m[3]) : Number(m[2])];
        for (let i = from; i <= to; i++) ids.add(`p${page}b${i}`);
      }
      blocks = all.filter((b) => ids.has(b.id));
    } else {
      blocks = (await pageBlocks(doc, page)).filter((b) => !isFurniture(b));
    }

    const texts = blocks
      .map((b) => asPrinted(b.text.replace(/\s+/g, " ").trim()))
      .filter((t) => t.length > 1 && !unreadable(t));
    const words = texts.join(" ").split(/\s+/).filter(Boolean).length;
    const pics = used.has(page) ? [] : imagesOf(page).filter((i) => !shown.has(i.file.split("/").pop().replace(/\.jpg$/, "")));
    if (words < MIN_WORDS && !pics.length) continue;

    const { kind, label } = classify(texts.join(" "));
    // the article this page sits nearest to in print
    const host = own
      .map((s) => ({ s, d: Math.min(...s.source.pdfPages.map((p) => Math.abs(p - page))) }))
      .sort((a, b) => a.d - b.d || a.s.source.pdfPages[0] - b.s.source.pdfPages[0])[0];
    if (!host) continue;

    const images = [];
    for (const pic of pics) {
      // page furniture (logos, icons, rules) is not a printed picture
      if (Math.min(pic.width, pic.height) < MIN_PIXELS) continue;
      // nor is a flat field of colour cut out of the page background
      const stats = await sharp(pic.file).resize(32, 32, { fit: "fill" }).greyscale().stats();
      if (stats.channels[0].stdev < MIN_STDEV) continue;
      // nor a page fragment cut out with its white surroundings (a rule, a bar,
      // a corner mark), which carries almost no ink
      const thumb = await sharp(pic.file).flatten({ background: "#ffffff" }).greyscale().resize(64, 64, { fit: "fill" }).raw().toBuffer();
      const ground = thumb[0];
      let ink = 0;
      for (const px of thumb) if (Math.abs(px - ground) > 24) ink++;
      if (ink / thumb.length < MIN_INK) continue;
      const ref = pic.file.split("/").pop().replace(/\.jpg$/, "");
      const dir = `../public/images/extras/${edition}`;
      await fs.mkdir(dir, { recursive: true });
      const rel = `/images/extras/${edition}/${ref}.webp`;
      // the same advertisement runs in several editions: encode each file once
      const hash = crypto.createHash("sha1").update(await fs.readFile(pic.file)).digest("hex").slice(0, 10);
      if (seen.has(hash)) {
        images.push(seen.get(hash));
        continue;
      }
      let img = sharp(pic.file);
      // A picture cut from a page often carries the blank page around it — a
      // cut-out portrait can be four-fifths empty. Trimmed to its own content
      // it sits in a layout as a picture rather than floating in a field of
      // white. Kept whole if trimming would leave almost nothing, which means
      // the reading was wrong rather than the picture being mostly margin.
      try {
        const trimmed = await sharp(pic.file).flatten({ background: "#ffffff" }).trim({ threshold: TRIM_THRESHOLD }).toBuffer({ resolveWithObject: true });
        if (trimmed.info.width >= TRIM_FLOOR && trimmed.info.height >= TRIM_FLOOR) img = sharp(trimmed.data);
      } catch {
        // nothing to trim, or the picture is one flat colour: keep it as it is
      }
      const meta = await img.metadata();
      if (meta.width > MAX_W) img = img.resize({ width: MAX_W });
      const buf = await img.webp({ quality: 78, effort: 5 }).toBuffer({ resolveWithObject: true });
      await fs.writeFile(`${dir}/${ref}.webp`, buf.data);
      const entry = { src: rel, width: buf.info.width, height: buf.info.height };
      seen.set(hash, entry);
      images.push(entry);
      pictures++;
    }

    (out[host.s.slug] ??= []).push({
      kind,
      label,
      pdfPage: page,
      printedPage: printedFor(edition, page),
      paragraphs: texts,
      images,
    });
    units++;
  }
}

const file = `import { StoryExtra } from "@/types";

/**
 * Everything else printed in each edition — advertising, 'In Focus'
 * advertorials, SpiceJet service and menu pages, contents and cover pages and
 * reader pages — kept with the article it is printed nearest to.
 *
 * Generated by .qa/build-extras.mjs from the edition PDFs. Text is printed
 * text, in printed order; nothing is written for it.
 */
export const extras: Record<string, StoryExtra[]> = ${JSON.stringify(out, null, 2)};
`;
await fs.writeFile("../src/data/extras.ts", file);
console.log(`wrote ${units} extras (${pictures} pictures) for ${Object.keys(out).length} stories`);
