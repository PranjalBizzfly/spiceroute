// Prints the numbered lines of text blocks, for choosing "@from-to" line
// ranges in specs (e.g. two printed captions set as one block).
// Usage: node lines.mjs <edition> <blockId> [<blockId> ...]
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "./blocks.mjs";

const args = process.argv.slice(2);
const items = args.includes("--items"); // show each text item with its x
const [edition, ...ids] = args.filter((a) => a !== "--items");
const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
const cache = {};
for (const id of ids) {
  const page = Number(id.match(/^p(\d+)b/)[1]);
  cache[page] ??= await pageBlocks(doc, page);
  const b = cache[page].find((x) => x.id === id);
  if (!b) {
    console.log(`${id}: not found`);
    continue;
  }
  console.log(`${id} (${b.font} ${b.size}pt)`);
  b.rawLines.forEach((l, i) => console.log(`  ${String(i).padStart(2)} @${Math.round(l.x)},${Math.round(l.y)}  ${items ? l.items.map((it) => `[${it.str}]@${Math.round(it.x)}`).join(" ") : l.items.map((it) => it.str).join("")}`));
}
