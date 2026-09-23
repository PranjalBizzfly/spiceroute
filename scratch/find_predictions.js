const fs = require('fs');
const content = fs.readFileSync('./src/data/stories.ts', 'utf8');

// Find all story objects where category is predictions
const stories = [];
const blocks = content.split(/\{\s*id:\s*["']/);
for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const idMatch = block.match(/^([^"']+)/);
  const id = idMatch ? idMatch[1] : '';
  if (block.includes('category: "predictions"')) {
    const heroImageMatch = block.match(/heroImage:\s*"([^"]+)"/);
    const heroImageAltMatch = block.match(/heroImageAlt:\s*"([^"]+)"/);
    const titleMatch = block.match(/title:\s*"([^"]+)"/);
    const editionSlugMatch = block.match(/editionSlug:\s*"([^"]+)"/);
    const img = heroImageMatch ? heroImageMatch[1] : '';
    const fileExists = fs.existsSync('./public' + img);
    let size = null;
    if (fileExists) {
      const stats = fs.statSync('./public' + img);
      size = stats.size;
    }
    stories.push({
      id,
      title: titleMatch ? titleMatch[1] : '',
      editionSlug: editionSlugMatch ? editionSlugMatch[1] : '',
      heroImage: img,
      fileExists,
      fileSize: size,
      heroImageAlt: heroImageAltMatch ? heroImageAltMatch[1] : ''
    });
  }
}
console.log(JSON.stringify(stories, null, 2));
