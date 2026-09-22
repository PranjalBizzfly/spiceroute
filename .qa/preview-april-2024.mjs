import fs from "fs";
import path from "path";
import sharp from "sharp";

const files = ["p03-2.jpg", "p08-2.jpg", "p21-1.jpg", "p24-1.jpg", "p26-1.jpg"];
const outDir = ".qa/previews";

for (const f of files) {
  const p = path.join(".qa/extract/img/april-2024", f);
  if (fs.existsSync(p)) {
    const dst = path.join(outDir, `april-2024-${f}`);
    await sharp(p).resize(500).toFile(dst);
    console.log(`Saved ${dst}`);
  }
}
