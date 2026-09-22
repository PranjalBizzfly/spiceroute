// Completeness check: text blocks printed on a story's pages that its spec
// does not use. Everything listed must be either page furniture, another
// story/advert sharing the page, or knowingly excluded.
// Usage: node unreferenced.mjs [slug ...]
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "./blocks.mjs";
import { SPECS, SPREAD_EDITIONS } from "./article-specs.mjs";

const only = process.argv.slice(2);
const docs = {};
const ids = (v) => (v == null ? [] : Array.isArray(v) ? v.flatMap(ids) : typeof v === "object" ? Object.values(v).flatMap(ids) : typeof v === "string" && /^p\d+b\d+/.test(v) ? [v.split(/[@#]/)[0]] : []);

for (const spec of SPECS) {
  if (only.length && !only.includes(spec.slug)) continue;
  const used = new Set(ids([spec.body, spec.deck, spec.callouts, spec.pullQuotes, spec.caption, spec.captions, spec.byline, spec.uses]));
  for (const seg of spec.body) if (seg.dropcap) used.add(seg.dropcap);
  const ignored = new Set(spec.ignore ?? []);
  docs[spec.edition] ??= await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${spec.edition}.pdf`)), verbosity: 0 }).promise;
  const rows = [];
  for (const p of spec.pdfPages) {
    for (const b of await pageBlocks(docs[spec.edition], p)) {
      const t = b.text.replace(/\s+/g, " ").trim();
      if (!t || b.size < 1 || used.has(b.id) || ignored.has(b.id)) continue;
      // spread editions: only the halves (printed pages) the story occupies
      if (SPREAD_EDITIONS[spec.edition] && !spec.printedPages.includes(b.x < 595.5 ? 2 * p - 2 : 2 * p - 1)) continue;
      if (/^(\d{1,3}|\||SPICEROUTE|\d{1,3} \| SPICEROUTE|SPICEROUTE \| \d{1,3})$/i.test(t)) continue;
      // 2024 page furniture: running head "SPICEJET <section>", folio line "<Month> 2024",
      // and the standard disclaimers printed on every travel page
      if (/^(SPICEJET|Map not to scale|Images are for representational purposes only|(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d)$/i.test(t)) continue;
      rows.push(`  [${b.id}] ${b.font} ${b.size}pt (${t.length}): ${t.slice(0, 110)}`);
    }
  }
  console.log(`${spec.slug}: ${rows.length} unreferenced block(s)`);
  rows.forEach((r) => console.log(r));
}
