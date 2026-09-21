// Builds source-exact article data from the edition PDFs.
//
// Every character of body text comes from the PDF text layer via blocks.mjs.
// Specs (article-specs.mjs) only choose WHICH blocks form the article and what
// role they play (subhead, paragraph flow, note, callout...). Paragraph breaks
// come from the printed geometry (vertical gaps), inline emphasis from the
// printed fonts (italic -> *em*, heavier weight -> **strong**).
//
// Usage: node build-articles.mjs [--write] [slug ...]
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "./blocks.mjs";
import { SPECS, HYPHENS, PDF_FILES, FOLIO_OFFSET, SPREAD_EDITIONS } from "./article-specs.mjs";

const docs = {};
const blockCache = {};
// "p56b2@13-" selects lines 13..end of block p56b2 (for blocks the PDF set as
// one frame but which hold two separate passages).
// "p70b39#x<300" keeps only the text items left of x=300 (two labels the PDF
// set on one line of one block); "#x>300" the ones to the right.
async function block(edition, ref) {
  const [base, filter] = ref.split("#");
  if (filter) {
    const m = filter.match(/^x([<>])(\d+)$/);
    if (!m) throw new Error(`bad item filter ${ref}`);
    const keep = (it) => (m[1] === "<" ? it.x < Number(m[2]) : it.x > Number(m[2]));
    const b = await block(edition, base);
    const rawLines = b.rawLines
      .map((l) => ({ ...l, items: l.items.filter(keep) }))
      .filter((l) => l.items.length)
      .map((l) => ({ ...l, x: l.items[0].x }));
    return { ...b, rawLines, text: rawLines.map((l) => l.items.map((i) => i.str).join("")).join(" ") };
  }
  const [id, range] = ref.split("@");
  const b = await wholeBlock(edition, id);
  if (!range) return b;
  const [from, to] = range.split("-");
  const lines = b.rawLines.slice(Number(from), to === "" || to === undefined ? undefined : Number(to) + 1);
  const text = lines.map((l) => l.items.map((i) => i.str).join("")).join(" ");
  return { ...b, rawLines: lines, text };
}

async function wholeBlock(edition, id) {
  const page = Number(id.match(/^p(\d+)b/)[1]);
  const key = `${edition}-p${page}`;
  if (!blockCache[key]) {
    docs[edition] ??= await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
    blockCache[key] = await pageBlocks(docs[edition], page);
  }
  const b = blockCache[key].find((x) => x.id === id);
  if (!b) throw new Error(`${edition}: block ${id} not found`);
  return { ...b, page };
}

const problems = [];
const flag = (slug, msg) => problems.push(`${slug}: ${msg}`);

const isItalic = (font) => /Italic|Oblique/i.test(font);
// Symbol fonts whose text layer uses a stand-in character: the "Rupee" face
// draws ₹ for "`". Mapped back to the printed glyph; never styled.
const isSymbolFont = (font) => /Rupee/i.test(font);
const glyphs = (it) => (isSymbolFont(it.font) ? it.str.replace(/`/g, "₹") : it.str);
// Font weight on the usual scale, from the face name. Emphasis = heavier than
// the flow's own body face (e.g. Book/orange highlights inside Light text).
const weightRank = (font) => {
  const f = font.replace(/Italic|Oblique/gi, "");
  if (/Black|Heavy/i.test(f)) return 900;
  if (/ExtraBold|UltraBold/i.test(f)) return 800;
  if (/SemiBold|DemiBold|Semi|Demi/i.test(f)) return 600;
  if (/Bold/i.test(f)) return 700;
  if (/Medium/i.test(f)) return 500;
  if (/ExtraLight|UltraLight/i.test(f)) return 200;
  if (/Thin|Hairline/i.test(f)) return 100;
  if (/Light/i.test(f)) return 300;
  if (/Book/i.test(f)) return 350;
  return 400;
};

// Join an ordered list of blocks into paragraphs of styled runs.
async function flow(slug, edition, ids, { plain = false, dropcap = null, lightBase = false } = {}) {
  const lines = [];
  for (const id of ids) {
    const b = await block(edition, id);
    for (const l of b.rawLines) lines.push({ ...l, page: b.page, size: b.size });
  }
  // Base style = the most common font across the flow (by characters)
  const counts = {};
  for (const l of lines) for (const it of l.items) counts[it.font] = (counts[it.font] ?? 0) + it.str.length;
  // (notes: the lightest face, so a long bold label before a short value —
  // "Operational Hours: 12pm - 12am" — still reads as the label)
  const baseFont =
    Object.entries(counts).sort((a, b) => (lightBase ? weightRank(a[0]) - weightRank(b[0]) : 0) || b[1] - a[1])[0]?.[0] ?? "";
  const styleOf = (font) => {
    if (plain || isSymbolFont(font)) return "";
    const it = isItalic(font) && !isItalic(baseFont);
    const diff = weightRank(font) - weightRank(baseFont);
    // italic words set in a slightly heavier italic face (BookItalic in Light
    // text) are italics; a heavier upright face is printed emphasis/highlight
    const st = it ? diff >= 150 : diff > 25;
    return st ? "strong" : it ? "em" : "";
  };

  const paras = [[]]; // each para: array of {style, text}
  const paraPages = [lines[0]?.page]; // PDF page each paragraph starts on
  const push = (style, text) => {
    const p = paras[paras.length - 1];
    const last = p[p.length - 1];
    if (last && last.style === style) last.text += text;
    else p.push({ style, text });
  };
  const tail = () => {
    const p = paras[paras.length - 1];
    return p.map((r) => r.text).join("");
  };

  // Typical line step of this flow (median downward step between consecutive
  // lines in the same column). A paragraph break is a step clearly larger than
  // that — robust whether the print uses blank lines or smaller para spacing.
  const steps = [];
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1], b = lines[i];
    const dy = a.y - b.y;
    if (a.page === b.page && dy > 0 && dy < a.size * 3) steps.push(dy);
  }
  steps.sort((a, b) => a - b);
  const lineStep = steps.length ? steps[Math.floor(steps.length / 2)] : lines[0]?.size * 1.2;

  let prev = null;
  for (const l of lines) {
    const size = l.size;
    if (prev) {
      const sameLine = l.page === prev.page && Math.abs(l.y - prev.y) < size * 0.5 && l.x >= prev.endX - 1;
      if (sameLine) {
        const gap = l.x - prev.endX;
        if (gap > size * 0.15 && !/\s$/.test(tail()) && !/^\s/.test(l.items[0].str)) push(styleOf(l.items[0].font), " ");
      } else {
        const downGap = prev.page === l.page ? prev.y - l.y : 0;
        // a jump to another column (x moves a column width) continues the
        // paragraph even when that column starts lower on the page
        const sameColumn = Math.abs(l.x - prev.x) < 40;
        const isBreak = sameColumn && downGap > lineStep * 1.18 && downGap < size * 8;
        const t = tail();
        if (isBreak) {
          paras.push([]);
          paraPages.push(l.page);
        } else {
          const first = l.items[0].str.trimStart();
          const m = t.match(/([A-Za-z’']+)-$/);
          if (m && /^[a-z]/.test(first)) {
            const next = first.match(/^[A-Za-z’']+/)[0];
            const key = `${m[1]}-|${next}`;
            const decision = HYPHENS[key];
            if (decision === "join") trimLastHyphen(paras);
            else if (decision !== "keep") flag(slug, `undecided end-of-line hyphen "${key}"`);
          } else if (/[‘“(]$/.test(t) || (/[-–—]$/.test(t) && !/\s[-–—]$/.test(t))) {
            // opening quote/bracket, or a dash glued to the next word: no space
          } else if (!/\s$/.test(t)) {
            push(styleOf(l.items[0].font), " ");
          }
        }
      }
    }
    // emit items of this line
    let end = null;
    for (const it of l.items) {
      if (end !== null) {
        const gap = it.x - end;
        if (gap > it.size * 0.15 && !/\s$/.test(tail()) && !it.str.startsWith(" ")) push(styleOf(it.font), " ");
      }
      push(styleOf(it.font), glyphs(it));
      end = it.x + it.w;
    }
    prev = { page: l.page, y: l.y, x: l.x, endX: end ?? l.x, size };
  }

  // Serialise runs into text with light markup; move edge spaces outside markers.
  let out = paras
    .map((runs) =>
      runs
        .map(({ style, text }) => {
          if (!style || !text.trim()) return text;
          const lead = text.match(/^\s*/)[0];
          const trail = text.match(/\s*$/)[0];
          let core = text.trim();
          // punctuation printed in the italic/bold face sits outside the marker
          const punct = core.match(/[,.;:!?’”]+$/)?.[0] ?? "";
          core = core.slice(0, core.length - punct.length);
          const open = core.match(/^[‘“(]+/)?.[0] ?? "";
          core = core.slice(open.length);
          const mk = style === "strong" ? "**" : "*";
          return core ? `${lead}${open}${mk}${core}${mk}${punct}${trail}` : `${lead}${open}${punct}${trail}`;
        })
        .join("")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:!?’”)])/g, "$1")
        .replace(/([‘“(])\s+/g, "$1")
        .trim()
    );
  const pages = paraPages.filter((_, i) => out[i]);
  out = out.filter(Boolean);
  out.pages = pages;

  if (dropcap) {
    // drop caps are sometimes set as a lowercase script glyph; it is the
    // capital of the opening word, so it is capitalised (typographic only)
    const d = (await block(edition, dropcap)).text.trim().toUpperCase();
    out[0] = d + out[0].replace(/^\*+/, (m) => m); // drop cap letter glued to the first word
  }
  for (const p of out) if (/¬/.test(p)) flag(slug, "stray hyphen marker");
  return out;
}

function trimLastHyphen(paras) {
  const p = paras[paras.length - 1];
  const last = p[p.length - 1];
  last.text = last.text.replace(/-$/, "");
}

async function text(slug, edition, id, opts) {
  const ids = Array.isArray(id) ? id : [id];
  return (await flow(slug, edition, ids, { plain: true, ...opts })).join(" ");
}

const norm = (s) => s.toLowerCase().replace(/\*/g, "").replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^a-z0-9'&-]+/g, " ").trim();

export async function buildArticle(spec) {
  const { slug, edition } = spec;
  const pageText = [];
  for (const p of spec.pdfPages) {
    docs[edition] ??= await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
    blockCache[`${edition}-p${p}`] ??= await pageBlocks(docs[edition], p);
    pageText.push(blockCache[`${edition}-p${p}`].map((b) => b.text).join(" "));
  }
  const printed = norm(pageText.join(" "));
  const mustBePrinted = (label, value) => {
    if (!value) return;
    const words = norm(value).split(/\s+/).filter((w) => w.length > 1 || /\d/.test(w));
    const missing = words.filter((w) => !printed.includes(w));
    if (missing.length) flag(slug, `${label} "${value}" has words not printed on its pages: ${missing.join(", ")}`);
  };
  // A headline letter set as artwork (not in the text layer) is verified from
  // the page render instead; the spec must say which letters and why.
  if (spec.titleArtwork) {
    if (!spec.titleArtwork.verifiedFromRender) flag(slug, "titleArtwork needs verifiedFromRender");
    mustBePrinted("title (text-layer part)", spec.titleArtwork.textLayer);
  } else mustBePrinted("title", spec.title);
  mustBePrinted("section", spec.section);
  mustBePrinted("label", spec.label);
  mustBePrinted("author", spec.author);
  mustBePrinted("byline label", spec.bylineLabel);
  mustBePrinted("role", spec.role);

  const body = [];
  let n = 0;
  for (const seg of spec.body) {
    // PDF page where this segment starts (for placing the printed photographs)
    const firstRef = [seg.h, seg.note, seg.q, seg.flow, seg.list].find(Boolean);
    const firstId = [firstRef].flat(3)[0];
    const segPage = (await block(edition, firstId)).page;
    const before = body.length;
    if (seg.h)
      body.push({
        type: "subhead",
        text: await text(slug, edition, seg.h),
        ...(seg.n ? { number: seg.n } : {}),
        ...(seg.level ? { level: seg.level } : {}),
      });
    else if (seg.note)
      body.push({
        type: "note",
        // keep a printed bold label such as "Getting there:" distinct
        text: (await flow(slug, edition, Array.isArray(seg.note) ? seg.note : [seg.note], { lightBase: true })).join(" "),
      });
    else if (seg.q) {
      const qs = await flow(slug, edition, seg.q);
      qs.forEach((t, i) => body.push({ type: "question", text: t, page: qs.pages[i] }));
    }
    else if (seg.flow) {
      // an infographic statement (single) mixes sizes and weights: its lightest
      // face is the text, the heavier ones the printed highlights
      const paras = await flow(slug, edition, seg.flow, { dropcap: seg.dropcap, lightBase: Boolean(seg.single) });
      // a drop cap drawn as artwork (not in the text layer), verified on the render
      if (seg.dropcapArtwork) {
        if (!seg.dropcapArtwork.verifiedFromRender) flag(slug, "dropcapArtwork needs verifiedFromRender");
        paras[0] = seg.dropcapArtwork.letter + paras[0];
      }
      // single: one printed statement set in mixed sizes (infographics) — never split
      if (seg.single) body.push({ type: "p", text: paras.join(" "), page: paras.pages[0] });
      else paras.forEach((t, i) => body.push({ type: "p", text: t, page: paras.pages[i] }));
    } else if (seg.list && seg.split) {
      // one printed block of bullet points separated by a printed marker
      const t = (await flow(slug, edition, seg.list)).join(" ");
      body.push({ type: "list", items: t.split(seg.split).map((s) => s.trim()).filter(Boolean) });
    } else if (seg.list) {
      // styled: keep a printed bold label at the start of each item
      const items = [];
      for (const ids of seg.list) {
        const arr = Array.isArray(ids) ? ids : [ids];
        items.push(seg.styled ? (await flow(slug, edition, arr, { lightBase: true })).join(" ") : await text(slug, edition, arr));
      }
      body.push({ type: "list", items });
    }
    else throw new Error(`${slug}: unknown segment ${JSON.stringify(seg)}`);
    for (const b of body.slice(before)) b.page ??= segPage;
    n++;
  }
  // Documented typographic fixes only (spacing / quote marks), never wording.
  const typos = spec.typography ?? [];
  const applied = [];
  const fix = (s) => {
    if (typeof s !== "string") return s;
    for (const [from, to] of typos) if (s.includes(from)) { s = s.split(from).join(to); applied.push(`${from} → ${to}`); }
    return s;
  };
  for (const b of body) {
    if (b.text) b.text = fix(b.text);
    if (b.items) b.items = b.items.map(fix);
  }
  for (const [from] of typos) if (!applied.some((a) => a.startsWith(from))) flag(slug, `typography fix not applied (source text not found): ${from}`);
  // Standfirst: the printed deck; for a piece without one (the Chairman's
  // letter) the opening body paragraphs, verbatim.
  const deck = spec.deck
    ? await text(slug, edition, spec.deck)
    : spec.excerptFromBody
      ? (Array.isArray(spec.excerptFromBody) ? body.slice(...spec.excerptFromBody) : body.slice(0, spec.excerptFromBody)).map((b) => b.text).join(" ")
      : undefined;
  // Pieces printed without any standfirst (listings, columns) say so
  // explicitly and get none, rather than a borrowed paragraph
  if (!deck && !spec.noStandfirst) flag(slug, "no standfirst/excerpt");
  const callouts = spec.callouts ? await Promise.all(spec.callouts.map((id) => text(slug, edition, id))) : [];
  const pullQuotes = spec.pullQuotes ? await Promise.all(spec.pullQuotes.map((id) => text(slug, edition, id))) : [];
  const caption = spec.caption ? await text(slug, edition, spec.caption) : undefined;

  // Printed captions, each kept with the page it is printed on
  // { label?: ref, items: [ref | [refs]] } — each item is one printed caption
  const captions = [];
  for (const cap of spec.captions ?? []) {
    const first = [cap.items[0]].flat()[0];
    const page = Number(first.match(/^p(\d+)b/)[1]);
    if (!spec.pdfPages.includes(page)) flag(slug, `caption ${first} is not on the story's pages`);
    const items = [];
    for (const item of cap.items) items.push(await text(slug, edition, [item].flat()));
    captions.push({ pdfPage: page, ...(cap.label ? { label: await text(slug, edition, cap.label) } : {}), items });
  }

  // Gallery: the story's own printed photographs, by embedded-image ref.
  // "pNN-k+pMM-j" = the two halves of one photograph printed across a spread.
  const imageRef = async (ref, role) => {
    const parts = ref.split("+");
    for (const p of parts) {
      await fs.access(`extract/img/${edition}/${p}.jpg`).catch(() => flag(slug, `${role} ${p} not extracted`));
      const page = Number(p.match(/^p(\d+)-/)[1]);
      if (!spec.pdfPages.includes(page)) flag(slug, `${role} ${p} is not on the story's pages`);
    }
    return { ref, pdfPages: parts.map((p) => Number(p.match(/^p(\d+)-/)[1])) };
  };
  const gallery = [];
  for (const ref of spec.gallery ?? []) {
    const alt = spec.galleryAlt?.[ref];
    if (!alt) flag(slug, `gallery image ${ref} has no alt text`);
    gallery.push({ ...(await imageRef(ref, "gallery image")), alt });
  }
  // New stories name their lead photograph here (existing ones keep theirs)
  const hero = spec.hero ? { ...(await imageRef(spec.hero, "hero image")), alt: spec.heroAlt } : undefined;
  if (spec.hero && !spec.heroAlt) flag(slug, "hero image has no alt text");

  // Printed page numbers: check the folio printed on each page where the
  // text layer carries one
  // Spread editions: each PDF page holds two printed pages (2p-2, 2p-1); the
  // spec names the printed pages the story occupies.
  const spread = Boolean(SPREAD_EDITIONS[edition]);
  const offset = spec.folioOffset ?? FOLIO_OFFSET[edition] ?? 2;
  const pagesOf = (p) => (spread ? [2 * p - 2, 2 * p - 1] : [p - offset]);
  const printedPages = spread ? spec.printedPages : spec.pdfPages.map((p) => p - offset);
  if (spread) {
    if (!spec.printedPages?.length) flag(slug, "spread edition: printedPages must be given");
    for (const n of spec.printedPages ?? []) if (!spec.pdfPages.some((p) => pagesOf(p).includes(n))) flag(slug, `printed page ${n} is not on the story's PDF pages`);
  }
  for (const p of spec.pdfPages) {
    const blocks = blockCache[`${edition}-p${p}`];
    const folios = blocks
      .map((b) => b.text.replace(/\s+/g, " ").trim())
      .map((t) => t.match(/^(\d{1,3})\s*\|?\s*SPICEROUTE|SPICEROUTE\s*\|\s*(\d{1,3})$/i))
      .filter(Boolean)
      .map((m) => Number(m[1] ?? m[2]));
    for (const n of folios) if (!pagesOf(p).includes(n)) flag(slug, `pdf p${p} prints folio ${n}, expected ${pagesOf(p).join("/")}`);
  }
  return {
    slug,
    title: spec.title,
    label: spec.label,
    section: spec.section,
    author: spec.author,
    // printed credit wording before the name, e.g. "Photos by"
    ...(spec.bylineLabel ? { bylineLabel: spec.bylineLabel } : {}),
    ...(spec.collapsible ? { collapsible: true } : {}),
    role: spec.role,
    excerpt: deck ?? "",
    body,
    callouts,
    pullQuotes,
    heroImageCaption: caption,
    captions,
    gallery,
    ...(hero ? { hero } : {}),
    ...(spec.category ? { category: spec.category } : {}),
    typographyFixes: [...new Set(applied)],
    source: {
      edition,
      pdf: PDF_FILES[edition],
      pdfPages: spec.pdfPages,
      printedPages,
      ...(spread ? { spreads: true } : {}),
      imagePdfPage: spec.imagePdfPage,
    },
  };
}

if (process.argv[1].endsWith("build-articles.mjs")) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const only = args.filter((a) => !a.startsWith("--"));
  const built = [];
  for (const spec of SPECS) {
    if (only.length && !only.includes(spec.slug)) continue;
    built.push(await buildArticle(spec));
  }
  await fs.mkdir("extract/articles", { recursive: true });
  for (const a of built) {
    await fs.writeFile(`extract/articles/${a.slug}.json`, JSON.stringify(a, null, 1));
    if (!write) {
      console.log(`\n######## ${a.slug} — "${a.title}" [${a.section}] by ${a.author ?? "(no byline)"}${a.role ? ", " + a.role : ""}`);
      console.log(`DECK: ${a.excerpt}`);
      for (const b of a.body) console.log(b.type === "p" ? `  ${b.text}` : `  <${b.type}${b.number ? " " + b.number : ""}> ${b.text ?? b.items?.join(" | ")}`);
      for (const c of a.callouts) console.log(`  <callout> ${c}`);
      for (const q of a.pullQuotes) console.log(`  <pullquote> ${q}`);
      if (a.heroImageCaption) console.log(`  <caption> ${a.heroImageCaption}`);
    }
  }
  if (problems.length) {
    console.log(`\n${problems.length} PROBLEM(S):\n  ` + problems.join("\n  "));
    process.exitCode = 1;
  } else console.log(`\nbuilt ${built.length} article(s), no problems`);
}
