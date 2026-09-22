import fs from "fs";
import path from "path";

const targets = [
  { ed: "september-2026", pages: [3, 4, 5] },
  { ed: "august-2026", pages: [3, 4, 5] },
  { ed: "july-2026", pages: [3, 4, 5] },
  { ed: "june-2026", pages: [4, 5, 6] },
  { ed: "may-2026", pages: [4, 5, 6] },
  { ed: "march-2026", pages: [4, 5, 6, 7] },
  { ed: "may-2024", pages: [4, 5, 6] },
  { ed: "april-2024", pages: [4, 5, 6, 7] },
  { ed: "march-2024", pages: [4, 5, 6] },
  { ed: "february-2024", pages: [4, 5, 6] }
];

for (const t of targets) {
  const dir = path.join(".qa/extract/img", t.ed);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => {
    return t.pages.some(p => {
      const pStr = p < 10 ? `0${p}` : `${p}`;
      return f.startsWith(`p${pStr}-`);
    });
  });
  console.log(`\n=== ${t.ed} ===`);
  for (const f of files) {
    const stat = fs.statSync(path.join(dir, f));
    console.log(`  ${f}: ${stat.size} bytes`);
  }
}
