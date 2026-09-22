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
  if (!fs.existsSync(dir)) {
    console.log(`${ed}: Directory not found`);
    continue;
  }
  const files = fs.readdirSync(dir).filter(f => {
    const m = f.match(/^p0*([1-9]|1[0-5])-/);
    return !!m;
  });
  console.log(`=== ${ed} (early pages: ${files.length} images) ===`);
  for (const f of files.slice(0, 10)) {
    const stat = fs.statSync(path.join(dir, f));
    console.log(`  ${f} (${stat.size} bytes)`);
  }
}
