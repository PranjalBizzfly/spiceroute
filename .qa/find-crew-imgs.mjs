import fs from "fs";
import path from "path";
import sharp from "sharp";

const editions = ["july-2026", "april-2024", "may-2026", "september-2026"];

for (const ed of editions) {
  const p = `.qa/extract/${ed}.pages.json`;
  if (!fs.existsSync(p)) continue;
  const pages = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`\n=== Checking ${ed} ===`);
  pages.forEach((pg, idx) => {
    const text = pg.text || "";
    const pageNum = pg.pageNumber || idx + 1;
    if (text.match(/spotlight zone|superstars|cloud compliments|spiceplus|spicemax|cabin crew|captain|flight attendant|take off/i)) {
      const pStr = pageNum < 10 ? `0${pageNum}` : `${pageNum}`;
      const imgDir = `.qa/extract/img/${ed}`;
      const imgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter(f => f.startsWith(`p${pStr}-`)) : [];
      console.log(`Page ${pageNum}: text=${text.slice(0, 80).replace(/\s+/g, " ")} | imgs=${imgs.join(", ")}`);
    }
  });
}
