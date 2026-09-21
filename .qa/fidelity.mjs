// Measures how much of each story's web text appears word-for-word in its
// edition PDF, using 5-word shingles (robust to line breaks and columns).
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, " ")
    .replace(/-\s+/g, "") // hyphenated line breaks
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const shingles = (s, n = 5) => {
  const w = norm(s).split(" ").filter(Boolean);
  const out = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(" "));
  return out;
};

// PDF text in content-stream order (keeps each text frame's reading order)
const pdfShingles = {};
for (const ed of ["september-2026", "august-2026", "july-2026"]) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${ed}.pdf`)), verbosity: 0 }).promise;
  let text = "";
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    text += " " + tc.items.map((i) => i.str + (i.hasEOL ? " " : "")).join("");
  }
  pdfShingles[ed] = new Set(shingles(text));
}

const src = await fs.readFile("../src/data/stories.ts", "utf8");
const blocks = src.split(/\n  \{\n/).slice(1);
const report = [];
for (const b of blocks) {
  const slug = b.match(/slug: "([^"]+)"/)[1];
  const ed = b.match(/editionSlug: "([^"]+)"/)[1];
  const grab = (key) => {
    const m = b.match(new RegExp(`${key}: \\[([\\s\\S]*?)\\n    \\]`));
    return m ? [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]) : [];
  };
  const score = (t) => {
    const sh = shingles(t);
    return sh.length ? sh.filter((s) => pdfShingles[ed].has(s)).length / sh.length : 1;
  };
  const paras = grab("content").map((p) => ({ p, s: score(p) }));
  const quotes = grab("pullQuotes").map((p) => ({ p, s: score(p) }));
  const excerptM = b.match(/excerpt:\s*"((?:[^"\\]|\\.)*)"/);
  report.push({
    slug,
    edition: ed,
    excerpt: excerptM ? score(excerptM[1]) : null,
    paragraphs: paras.map((x) => +x.s.toFixed(2)),
    pullQuotes: quotes.map((x) => +x.s.toFixed(2)),
    lowParagraphs: paras.filter((x) => x.s < 0.5).map((x) => x.p.slice(0, 110)),
    lowQuotes: quotes.filter((x) => x.s < 0.5).map((x) => x.p.slice(0, 110)),
  });
}
await fs.writeFile("extract/fidelity.json", JSON.stringify(report, null, 1));
for (const r of report) {
  const avg = r.paragraphs.reduce((a, b) => a + b, 0) / r.paragraphs.length;
  console.log(
    r.slug.padEnd(44),
    `avg ${(avg * 100).toFixed(0).padStart(3)}%`,
    `| paras ${r.paragraphs.map((s) => (s * 100).toFixed(0)).join("/")}`,
    `| quotes ${r.pullQuotes.map((s) => (s * 100).toFixed(0)).join("/")}`
  );
}
