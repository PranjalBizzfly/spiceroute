import fs from "fs";

const files = [
  "september-2026.pages.json",
  "june-2026.pages.json",
  "may-2026.pages.json",
  "march-2026.pages.json",
  "august-2026.pages.json",
  "july-2026.pages.json",
  "may-2024.pages.json",
  "april-2024.pages.json",
  "march-2024.pages.json",
  "february-2024.pages.json"
];

for (const f of files) {
  const p = `.qa/extract/${f}`;
  if (!fs.existsSync(p)) continue;
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  console.log(`\n=== ${f} (Total pages: ${data.length}) ===`);
  for (const page of data) {
    const text = (page.text || "").toLowerCase();
    if (text.includes("welcome aboard") || text.includes("cmd") || text.includes("fleet") || text.includes("boeing") || text.includes("spicejet life")) {
      const imgCount = (page.images || []).length;
      console.log(`  Page ${page.pageNumber}: images=${imgCount}, snippet=${(page.text || "").slice(0, 100).replace(/\n/g, " ")}`);
    }
  }
}
