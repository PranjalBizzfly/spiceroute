const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const blocks = c.split(/\{\s*id:\s*"/).slice(1);
const imageMap = new Map();

for (const b of blocks) {
  const id = b.slice(0, b.indexOf('"'));
  const getF = (f) => { const m = new RegExp(f + ':\\s*"([^"]*)"').exec(b); return m ? m[1] : ''; };
  const title = getF('title');
  const cat = getF('category');
  const date = getF('date');
  const heroImage = getF('heroImage');
  const editionSlug = getF('editionSlug');
  
  if (heroImage) {
    if (!imageMap.has(heroImage)) {
      imageMap.set(heroImage, []);
    }
    imageMap.get(heroImage).push({ id, title, cat, date, editionSlug });
  }
}

console.log('=== DUPLICATE HERO IMAGES ACROSS STORIES ===');
let dupCount = 0;
for (const [img, stories] of imageMap.entries()) {
  if (stories.length > 1) {
    dupCount++;
    console.log(`\nImage: ${img} (used in ${stories.length} stories):`);
    stories.forEach(s => {
      console.log(`  - [${s.cat}] ${s.title} (${s.date}, id: ${s.id})`);
    });
  }
}
console.log(`\nTotal duplicated hero images: ${dupCount}`);
