import fs from "fs";
import path from "path";
import crypto from "crypto";

const content = fs.readFileSync("src/data/stories.ts", "utf8");
const blocks = content.split(/id:\s*['"]/);

const stories = [];
for (const b of blocks.slice(1)) {
  const slug = b.match(/slug:\s*['"]([^'"]+)['"]/)?.[1];
  const title = b.match(/title:\s*['"]([^'"]+)['"]/)?.[1];
  const heroImage = b.match(/heroImage:\s*['"]([^'"]+)['"]/)?.[1];
  const category = b.match(/category:\s*['"]([^'"]+)['"]/)?.[1];
  if (slug && heroImage) {
    stories.push({ slug, title, heroImage, category });
  }
}

console.log(`Total stories: ${stories.length}`);

// Check hash of each heroImage
const hashMap = new Map();
for (const s of stories) {
  // convert /images/... to public/images/...
  const imgPath = path.join("public", s.heroImage.replace(/^\//, ""));
  if (fs.existsSync(imgPath)) {
    const buf = fs.readFileSync(imgPath);
    const hash = crypto.createHash("md5").update(buf).digest("hex");
    if (!hashMap.has(hash)) {
      hashMap.set(hash, []);
    }
    hashMap.get(hash).push({ ...s, imgPath, size: buf.length });
  } else {
    console.log(`File not found: ${imgPath} for ${s.slug}`);
  }
}

const dups = Array.from(hashMap.entries()).filter(([_, list]) => list.length > 1);
console.log(`\nFound ${dups.length} duplicate image sets across all 151 stories:`);
for (const [hash, list] of dups) {
  console.log(`\nHash ${hash} (${list.length} occurrences):`);
  for (const item of list) {
    console.log(`  - [${item.category}] "${item.title}" (${item.slug}) -> ${item.heroImage}`);
  }
}
