import fs from "fs";
import path from "path";
import sharp from "sharp";

const files = ["p61-1.jpg", "p62-1.jpg", "p62-2.jpg", "p63-1.jpg", "p63-2.jpg", "p63-3.jpg", "p64-1.jpg", "p65-1.jpg", "p65-3.jpg"];
const outDir = ".qa/previews";

for (const f of files) {
  const p = path.join(".qa/extract/img/march-2026", f);
  if (fs.existsSync(p)) {
    const dst = path.join(outDir, `march-60-${f}`);
    await sharp(p).resize(500).toFile(dst);
    console.log(`Saved ${dst}`);
  }
}
