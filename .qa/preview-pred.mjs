import fs from "fs";
import path from "path";
import sharp from "sharp";

const files = [
  { ed: "september-2026", file: "p80-r1.jpg" },
  { ed: "august-2026", file: "p80-r1.jpg" },
  { ed: "july-2026", file: "p80-r1.jpg" },
  { ed: "june-2026", file: "p84-r1.jpg" },
  { ed: "may-2026", file: "p84-r1.jpg" },
  { ed: "april-2026", file: "p40-r1.jpg" },
  { ed: "march-2026", file: "p82-r1.jpg" },
  { ed: "may-2024", file: "p66-r1.jpg" },
  { ed: "april-2024", file: "p70-r1.jpg" },
  { ed: "march-2024", file: "p70-r1.jpg" },
  { ed: "february-2024", file: "p72-r1.jpg" }
];

const outDir = ".qa/previews";

for (const item of files) {
  const p = path.join(".qa/extract/img", item.ed, item.file);
  if (fs.existsSync(p)) {
    const meta = await sharp(p).metadata();
    const dst = path.join(outDir, `pred-${item.ed}-${item.file}`);
    await sharp(p).resize(500).toFile(dst);
    console.log(`${item.ed}/${item.file}: ${meta.width}x${meta.height}, preview saved to ${dst}`);
  } else {
    console.log(`${item.ed}/${item.file}: NOT FOUND`);
  }
}
