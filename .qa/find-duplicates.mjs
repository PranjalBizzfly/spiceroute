import fs from "fs";

const content = fs.readFileSync("src/data/stories.ts", "utf8");

// Parse objects or regex
const stories = [];
const blocks = content.split(/id:\s*['"]/);

for (const block of blocks.slice(1)) {
  const slugMatch = block.match(/slug:\s*['"]([^'"]+)['"]/);
  const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/);
  const heroImageMatch = block.match(/heroImage:\s*['"]([^'"]+)['"]/);
  const categoryMatch = block.match(/category:\s*['"]([^'"]+)['"]/);
  const editionMatch = block.match(/editionId:\s*['"]([^'"]+)['"]/);
  
  if (slugMatch && heroImageMatch) {
    stories.push({
      slug: slugMatch[1],
      title: titleMatch ? titleMatch[1] : "",
      heroImage: heroImageMatch[1],
      category: categoryMatch ? categoryMatch[1] : "",
      editionId: editionMatch ? editionMatch[1] : ""
    });
  }
}

console.log(`Total stories parsed: ${stories.length}`);

const imgMap = new Map();
for (const story of stories) {
  if (!imgMap.has(story.heroImage)) {
    imgMap.set(story.heroImage, []);
  }
  imgMap.get(story.heroImage).push(story);
}

const dups = Array.from(imgMap.entries()).filter(([_, list]) => list.length > 1);
console.log(`Found ${dups.length} duplicate hero images across stories:\n`);

for (const [img, list] of dups) {
  console.log(`=== Image: ${img} (${list.length} uses) ===`);
  for (const s of list) {
    console.log(`  - [${s.category}] "${s.title}" (${s.slug}, edition: ${s.editionId})`);
  }
  console.log("");
}
