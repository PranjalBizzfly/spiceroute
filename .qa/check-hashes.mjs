import fs from "fs";
import path from "path";
import crypto from "crypto";

const dir = "public/images/stories";
const files = fs.readdirSync(dir);
const hashMap = new Map();

for (const file of files) {
  const fullPath = path.join(dir, file);
  if (!fs.statSync(fullPath).isFile()) continue;
  const buf = fs.readFileSync(fullPath);
  const hash = crypto.createHash("md5").update(buf).digest("hex");
  if (!hashMap.has(hash)) {
    hashMap.set(hash, []);
  }
  hashMap.get(hash).push({ file, size: buf.length });
}

const dups = Array.from(hashMap.entries()).filter(([_, list]) => list.length > 1);
console.log(`Found ${dups.length} sets of duplicate files in ${dir}:`);

for (const [hash, list] of dups) {
  console.log(`\nHash ${hash} (${list.length} duplicates, size ${list[0].size} bytes):`);
  for (const item of list) {
    console.log(`  - ${item.file}`);
  }
}
