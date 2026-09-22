import fs from "fs";
import path from "path";
import sharp from "sharp";

const checks = [
  // september-2026
  { ed: "september-2026", pages: [24, 27, 42, 43, 44] },
  // august-2026
  { ed: "august-2026", pages: [5, 24, 34, 46, 47] },
  // july-2026
  { ed: "july-2026", pages: [8, 18, 44, 45, 46] },
  // june-2026
  { ed: "june-2026", pages: [5, 20, 24, 40, 41] },
  // may-2026
  { ed: "may-2026", pages: [6, 20, 24, 38, 39] },
  // march-2026
  { ed: "march-2026", pages: [8, 14, 18, 22, 24] },
  // may-2024
  { ed: "may-2024", pages: [5, 6, 7, 72] },
  // april-2024
  { ed: "april-2024", pages: [5, 6, 7, 72] },
  // march-2024
  { ed: "march-2024", pages: [5, 6, 7, 72] },
  // february-2024
  { ed: "february-2024", pages: [5, 6, 7, 36, 74] }
];

const outDir = ".qa/previews";

for (const c of checks) {
  const dir = path.join(".qa/extract/img", c.ed);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => {
    return c.pages.some(p => {
      const pStr = p < 10 ? `0${p}` : `${p}`;
      return f.startsWith(`p${pStr}-`);
    });
  });
  console.log(`\n=== ${c.ed} ===`);
  for (const f of files) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.size > 20000) {
      const meta = await sharp(p).metadata();
      const dst = path.join(outDir, `${c.ed}-${f}`);
      await sharp(p).resize(400).toFile(dst);
      console.log(`  ${f}: ${meta.width}x${meta.height}, ${stat.size} bytes -> saved ${dst}`);
    }
  }
}
