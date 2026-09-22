import fs from "fs";
import path from "path";
import sharp from "sharp";

const dir = ".qa/extract/img/april-2024";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".jpg"));
const largeFiles = [];

for (const f of files) {
  const p = path.join(dir, f);
  const stat = fs.statSync(p);
  if (stat.size > 50000) {
    try {
      const meta = await sharp(p).metadata();
      largeFiles.push({ f, size: stat.size, w: meta.width, h: meta.height });
    } catch {}
  }
}

console.log(`Found ${largeFiles.length} large images in april-2024:`);
for (const item of largeFiles.slice(0, 30)) {
  console.log(`  ${item.f}: ${item.w}x${item.h}, ${item.size} bytes`);
}
