import fs from "fs";

const content = fs.readFileSync("src/data/stories.ts", "utf8");
const blocks = content.split(/id:\s*['"]/);

for (const b of blocks.slice(1)) {
  const cat = b.match(/category:\s*['"]([^'"]+)['"]/)?.[1];
  if (cat === "predictions") {
    const slug = b.match(/slug:\s*['"]([^'"]+)['"]/)?.[1];
    const heroImage = b.match(/heroImage:\s*['"]([^'"]+)['"]/)?.[1];
    const title = b.match(/title:\s*['"]([^'"]+)['"]/)?.[1];
    console.log({ slug, title, heroImage });
  }
}
