import fs from "fs";
import path from "path";

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

for (const ed of editions) {
  const dir = path.join(".qa/extract/img", ed);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  // Find images on pages > 60
  const latePages = files.filter(f => {
    const m = f.match(/^p(\d+)-/);
    if (!m) return false;
    const page = parseInt(m[1], 10);
    return page >= 70;
  });
  console.log(`${ed}: ${latePages.length} images on pages >= 70 (total images: ${files.length})`);
}
