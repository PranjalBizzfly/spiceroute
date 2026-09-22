// Block-range helper for PDFs whose text layer sets one block per printed
// line (the 2024 editions): ids(page, from, to) lists the printed text blocks
// p<page>b<from>..b<to> in stream order, skipping empty/zero-size markers and
// any ids given in `except`. The builder still assembles every character
// from these blocks; this only saves listing each line by hand.
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "../blocks.mjs";

export async function blockRange(edition) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
  const cache = new Map();
  const page = async (p) => {
    if (!cache.has(p)) cache.set(p, await pageBlocks(doc, p));
    return cache.get(p);
  };
  // preload so ids() can stay synchronous inside spec literals
  const load = async (...pages) => {
    for (const p of pages) await page(p);
  };
  const ids = (p, from, to, except = []) => {
    const blocks = cache.get(p);
    if (!blocks) throw new Error(`${edition}: page ${p} not loaded`);
    const skip = new Set([except].flat().map((e) => (typeof e === "number" ? `p${p}b${e}` : e)));
    return blocks
      .filter((b) => {
        const n = Number(b.id.split("b")[1]);
        return n >= from && n <= to && b.size >= 1 && b.text.trim() && !skip.has(b.id);
      })
      .map((b) => b.id);
  };
  return { load, ids, done: () => doc.destroy() };
}
