// Extract per-page text from the edition PDFs so article inventory can be
// checked against the printed source. Output: extract/<edition>.pages.json
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const editions = process.argv.slice(2);

for (const slug of editions) {
  const data = new Uint8Array(await fs.readFile(`pdf/${slug}.pdf`));
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    // Rebuild lines from text items using their y position
    const lines = new Map();
    for (const item of tc.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      lines.set(y, (lines.get(y) ?? "") + item.str + (item.hasEOL ? "" : " "));
    }
    const text = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, l]) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
    pages.push({ page: n, text });
  }
  await fs.writeFile(`extract/${slug}.pages.json`, JSON.stringify(pages, null, 1));
  console.log(`${slug}: ${doc.numPages} pages extracted`);
}
