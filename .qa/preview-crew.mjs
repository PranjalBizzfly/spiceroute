import fs from "fs";
import path from "path";
import sharp from "sharp";

const files = [
  { ed: "july-2026", file: "p32-1.jpg" },
  { ed: "july-2026", file: "p74-1.jpg" },
  { ed: "july-2026", file: "p24-1.jpg" },
  { ed: "april-2024", file: "p23-1.jpg" },
  { ed: "april-2024", file: "p71-1.jpg" },
  { ed: "april-2024", file: "p71-2.jpg" },
  { ed: "april-2024", file: "p71-3.jpg" },
  { ed: "may-2026", file: "p42-1.jpg" },
  { ed: "may-2026", file: "p04-4.jpg" }
];

const outDir = ".qa/previews";

for (const item of files) {
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
