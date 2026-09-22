import fs from "fs";
import path from "path";

const editions = [
  "september-2026",
  "august-2026",
  "july-2026",
  "june-2026",
  "may-2026",
  "april-2026",
  "march-2026",
  "may-2024",
  "april-2024",
  "march-2024",
  "february-2024"
];

for (const ed of editions) {
  const p = `.qa/extract/${ed}.pages.json`;
  if (!fs.existsSync(p)) continue;
  const pages = JSON.parse(fs.readFileSync(p, "utf8"));
  pages.forEach((pg, idx) => {
    const text = pg.text || "";
    if (text.match(/Dr\. Prem Kumar Sharma|PREDICTIONS|Your Forecast/i)) {
      const pageNum = pg.pageNumber || idx + 1;
      const pStr = pageNum < 10 ? `0${pageNum}` : `${pageNum}`;
      const imgDir = `.qa/extract/img/${ed}`;
      const imgs = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter(f => f.startsWith(`p${pStr}-`)) : [];
      console.log(`${ed} pg ${pageNum}: ${imgs.join(", ")}`);
    }
  });
}
