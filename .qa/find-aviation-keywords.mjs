import fs from "fs";
import path from "path";
import sharp from "sharp";

const editions = [
  "september-2026",
  "august-2026",
  "july-2026",
  "june-2026",
  "may-2026",
  "march-2026",
  "may-2024",
  "april-2024",
  "march-2024",
  "february-2024"
];

const results = [];

for (const ed of editions) {
  const dir = path.join(".qa/extract/img", ed);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".jpg"));
  for (const f of files) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.size > 50000) {
      results.push({ ed, file: f, size: stat.size });
    }
  }
}

console.log(`Found ${results.length} large images (>50KB) across target editions.`);

// Let's check text around these images or pages
const pagesWithSpiceJet = [];
for (const ed of editions) {
  const p = `.qa/extract/${ed}.pages.json`;
  if (!fs.existsSync(p)) continue;
  const pages = JSON.parse(fs.readFileSync(p, "utf8"));
  pages.forEach((pg, idx) => {
    const text = pg.text || "";
    if (text.match(/cabin|crew|boarding|runway|cockpit|flight attendant|inflight|destination|spiceclub|spicexpress/i)) {
      pagesWithSpiceJet.push({ ed, page: pg.pageNumber || idx + 1, snippet: text.slice(0, 100).replace(/\s+/g, " ") });
    }
  });
}
console.log(`Found ${pagesWithSpiceJet.length} pages mentioning aviation keywords:`);
for (const item of pagesWithSpiceJet.slice(0, 25)) {
  console.log(`  ${item.ed} pg ${item.page}: ${item.snippet}`);
}
