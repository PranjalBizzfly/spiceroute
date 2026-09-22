import fs from "fs";

const content = fs.readFileSync("src/data/stories.ts", "utf8");
const blocks = content.split(/id:\s*['"]/);

for (const b of blocks.slice(1)) {
  const slug = b.match(/slug:\s*['"]([^'"]+)['"]/)?.[1];
  const cat = b.match(/category:\s*['"]([^'"]+)['"]/)?.[1];
  if (cat === "welcome-aboard") {
    const title = b.match(/title:\s*['"]([^'"]+)['"]/)?.[1];
    const heroImage = b.match(/heroImage:\s*['"]([^'"]+)['"]/)?.[1];
    const heroImageAlt = b.match(/heroImageAlt:\s*['"]([^'"]+)['"]/)?.[1];
    const heroImageSource = b.match(/heroImageSource:\s*['"]([^'"]+)['"]/)?.[1];
    const editionId = b.match(/editionId:\s*['"]([^'"]+)['"]/)?.[1];
    const printPage = b.match(/printPage:\s*(\d+)/)?.[1];
    console.log({ slug, title, editionId, printPage, heroImage, heroImageAlt, heroImageSource });
  }
}
