import fs from "fs";
import path from "path";
import sharp from "sharp";

const list = [
  { ed: "august-2026", file: "p34-1.jpg" },
  { ed: "july-2026", file: "p18-1.jpg" },
  { ed: "march-2026", file: "p18-1.jpg" },
  { ed: "may-2024", file: "p72-1.jpg" },
  { ed: "april-2024", file: "p72-1.jpg" },
  { ed: "march-2024", file: "p05-2.jpg" },
  { ed: "march-2024", file: "p72-1.jpg" },
  { ed: "february-2024", file: "p36-1.jpg" },
  { ed: "february-2024", file: "p36-2.jpg" },
  { ed: "february-2024", file: "p36-3.jpg" },
  { ed: "february-2024", file: "p74-1.jpg" }
];

const outDir = ".qa/previews";

for (const item of list) {
  const p = path.join(".qa/extract/img", item.ed, item.file);
  if (fs.existsSync(p)) {
    const meta = await sharp(p).metadata();
    const dst = path.join(outDir, `${item.ed}-${item.file}`);
    await sharp(p).resize(500).toFile(dst);
    console.log(`${item.ed}/${item.file}: ${meta.width}x${meta.height}, preview saved to ${dst}`);
  } else {
    console.log(`${item.ed}/${item.file}: NOT FOUND`);
  }
}
