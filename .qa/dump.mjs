// Compact block dump for writing article specs.
// Usage: node dump.mjs <edition> <from>[-<to>] [--full]
// Prints each text block (id, font, size, position) with the start and end of
// its text; --full prints whole texts. Page furniture (folios, empty blocks)
// is dimmed with a leading "·".
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "./blocks.mjs";

const [edition, range, flag] = process.argv.slice(2);
const [from, to] = range.split("-").map(Number);
const full = flag === "--full";
const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
const imgIndex = JSON.parse(await fs.readFile(`extract/img/${edition}/index.json`, "utf8").catch(() => "[]"));
for (let p = from; p <= (to || from); p++) {
  const blocks = await pageBlocks(doc, p);
  await fs.mkdir("extract/blocks", { recursive: true });
  await fs.writeFile(`extract/blocks/${edition}-p${p}.json`, JSON.stringify(blocks, null, 1));
  const imgs = imgIndex.filter((i) => i.page === p).map((i) => `${i.file.split("/").pop().replace(".jpg", "")} ${i.width}x${i.height}`);
  console.log(`\n==== ${edition} p${p} — ${blocks.length} blocks — images: ${imgs.join(", ") || "none"}`);
  for (const b of blocks) {
    const t = b.text.replace(/\s+/g, " ").trim();
    const furniture = !t || /^(\d{1,3}|\||SPICEROUTE|SPICEROUTE \| \d+|\d+ \| SPICEROUTE)$/i.test(t) || b.size < 1;
    const shown = full || t.length <= 140 ? t : `${t.slice(0, 90)} … ${t.slice(-40)}`;
    console.log(`${furniture ? "·" : " "}[${b.id}] ${b.font} ${b.size}pt @${b.x},${b.y} (${t.length}): ${shown}`);
  }
}
