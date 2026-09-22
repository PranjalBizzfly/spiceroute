import fs from "fs";
import path from "path";

const files = [
  { ed: "september-2026", file: "september-2026.pages.json" },
  { ed: "august-2026", file: "august-2026.pages.json" },
  { ed: "july-2026", file: "july-2026.pages.json" },
  { ed: "june-2026", file: "june-2026.pages.json" },
  { ed: "may-2026", file: "may-2026.pages.json" },
  { ed: "march-2026", file: "march-2026.pages.json" },
  { ed: "may-2024", file: "may-2024.pages.json" },
  { ed: "april-2024", file: "april-2024.pages.json" },
  { ed: "march-2024", file: "march-2024.pages.json" },
  { ed: "february-2024", file: "february-2024.pages.json" }
];

for (const item of files) {
  const p = `.qa/extract/${item.file}`;
  if (!fs.existsSync(p)) continue;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`\n=================== ${item.ed} ===================`);
  data.forEach((pg, idx) => {
    const pageNum = pg.pageNumber || (idx + 1);
    const text = (pg.text || "").replace(/\s+/g, " ");
    const matches = [
      "welcome aboard",
      "cmd",
      "spicejet inducts",
      "breaking news",
      "spicejet enters",
      "restarts flights",
      "spicejet introduces",
      "spicejet to enhance",
      "connecting ayodhya",
      "fleet",
      "boeing",
      "airbus"
    ].filter(term => text.toLowerCase().includes(term));
    
    if (matches.length > 0) {
      console.log(`Page ${pageNum} (matches: ${matches.join(", ")}):`);
      console.log(`   Snippet: ${text.slice(0, 140)}...`);
      // check images for this page in img dir
      const pStr = pageNum < 10 ? `0${pageNum}` : `${pageNum}`;
      const imgDir = `.qa/extract/img/${item.ed}`;
      if (fs.existsSync(imgDir)) {
        const imgs = fs.readdirSync(imgDir).filter(f => f.startsWith(`p${pStr}-`));
        console.log(`   Images: ${imgs.join(", ")}`);
      }
    }
  });
}
