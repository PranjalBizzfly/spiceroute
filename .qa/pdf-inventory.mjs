// Inventory of every edition PDF: page count, text-layer coverage, and the
// printed contents pages (section names with page numbers).
// Writes extract/<edition>.pages.json (text per page) and
// extract/inventory.json. Usage: node pdf-inventory.mjs [edition ...]
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const list = (await fs.readFile("tmp/pdf-list.txt", "utf8")).trim().split("\n").map((l) => l.split(" ")[0]);
const only = process.argv.slice(2);
const inventory = JSON.parse(await fs.readFile("extract/inventory.json", "utf8").catch(() => "{}"));

for (const slug of list) {
  if (only.length && !only.includes(slug)) continue;
  const file = `pdf/${slug}.pdf`;
  try { await fs.access(file); } catch { console.log(`skip ${slug}: not downloaded`); continue; }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(file)), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    const text = tc.items.map((i) => i.str + (i.hasEOL ? "\n" : "")).join("");
    pages.push({ n, text });
    page.cleanup();
  }
  // keep the page texts the existing audits were built on
  const pagesFile = `extract/${slug}.pages.json`;
  const exists = await fs.access(pagesFile).then(() => true, () => false);
  if (!exists) await fs.writeFile(pagesFile, JSON.stringify(pages.map((p) => ({ text: p.text }))));
  const chars = pages.map((p) => p.text.replace(/\s+/g, "").length);
  const textPages = chars.filter((c) => c > 200).length;
  // contents pages: many "number + CAPS words" pairs, or the word CONTENTS
  const contents = pages
    .filter((p) => /\bCONTENTS\b|IN THIS ISSUE/i.test(p.text) || (p.text.match(/(^|\s)\d{2,3}\s+[A-Z][A-Z &’'-]{3,}/g) || []).length >= 4)
    .map((p) => p.n)
    .filter((n) => n <= 16);
  inventory[slug] = { pages: doc.numPages, textPages, totalChars: chars.reduce((a, b) => a + b, 0), contentsPages: contents };
  console.log(`${slug.padEnd(16)} ${String(doc.numPages).padStart(3)} pages | ${String(textPages).padStart(3)} with text | ${String(inventory[slug].totalChars).padStart(7)} chars | contents p${contents.join(",p") || "—"}`);
  await doc.destroy();
}
await fs.writeFile("extract/inventory.json", JSON.stringify(inventory, null, 1));
