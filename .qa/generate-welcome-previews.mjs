import fs from "fs";
import path from "path";
import sharp from "sharp";

const files = [
  { ed: "june-2026", file: "p05-1.jpg" },
  { ed: "june-2026", file: "p05-2.jpg" },
  { ed: "may-2026", file: "p05-1.jpg" },
  { ed: "may-2026", file: "p04-4.jpg" },
  { ed: "march-2026", file: "p05-1.jpg" },
  { ed: "march-2026", file: "p08-1.jpg" },
  { ed: "august-2026", file: "p03-1.jpg" },
  { ed: "august-2026", file: "p02-1.jpg" },
  { ed: "july-2026", file: "p05-1.jpg" },
  { ed: "july-2026", file: "p02-1.jpg" },
  { ed: "april-2024", file: "p07-2.jpg" },
  { ed: "april-2024", file: "p06-1.jpg" },
  { ed: "march-2024", file: "p05-2.jpg" },
  { ed: "march-2024", file: "p04-1.jpg" },
  { ed: "february-2024", file: "p04-1.jpg" },
  { ed: "february-2024", file: "p05-2.jpg" }
];

const outDir = ".qa/previews";
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const f of files) {
  const src = path.join(".qa/extract/img", f.ed, f.file);
  const dst = path.join(outDir, `${f.ed}-${f.file}`);
  if (fs.existsSync(src)) {
    await sharp(src).resize(400).toFile(dst);
    console.log(`Created preview: ${dst}`);
  }
}
