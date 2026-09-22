import fs from "fs";
import path from "path";
import sharp from "sharp";

// Inspect jaipur-in-historys-glow images
const dir = "public/images/stories/jaipur-in-historys-glow";
const files = fs.readdirSync(dir);
console.log("Files in jaipur-in-historys-glow:");
for (const f of files) {
  const meta = await sharp(path.join(dir, f)).metadata();
  console.log(`  ${f}: ${meta.width}x${meta.height}`);
}

// Inspect march-2026 pages 60-66
const marchDir = ".qa/extract/img/march-2026";
const marchFiles = fs.readdirSync(marchDir).filter(f => f.match(/^p(6[0-6])-/));
console.log("\nFiles in march-2026 p60-66:");
for (const f of marchFiles) {
  const stat = fs.statSync(path.join(marchDir, f));
  if (stat.size > 20000) {
    const meta = await sharp(path.join(marchDir, f)).metadata();
    console.log(`  ${f}: ${meta.width}x${meta.height}, ${stat.size} bytes`);
  }
}
