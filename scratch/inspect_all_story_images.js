const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const blocks = c.split(/\{\s*id:\s*"/).slice(1);
const stories = [];

for (const b of blocks) {
  const id = b.slice(0, b.indexOf('"'));
  const getF = (f) => {
    const m = new RegExp(f + ':\\s*"([^"]*)"').exec(b);
    return m ? m[1] : '';
  };
  const title = getF('title');
  const category = getF('category');
  const section = getF('section');
  const heroImage = getF('heroImage');
  const heroImageAlt = getF('heroImageAlt');
  const heroImageSource = getF('heroImageSource');
  const editionSlug = getF('editionSlug');
  
  // also check if gallery has images
  const galleryMatch = b.match(/gallery:\s*\[([\s\S]*?)\]/);
  const gallery = [];
  if (galleryMatch) {
    const gBlocks = galleryMatch[1].split(/\{\s*src:\s*"/).slice(1);
    for (const gb of gBlocks) {
      const src = gb.slice(0, gb.indexOf('"'));
      const altM = gb.match(/alt:\s*"([^"]*)"/);
      gallery.push({ src, alt: altM ? altM[1] : '' });
    }
  }

  stories.push({ id, title, category, section, heroImage, heroImageAlt, heroImageSource, editionSlug, gallery });
}

// Categorize
const nonPhotos = stories.filter(s => 
  s.heroImageAlt.toLowerCase().includes('illustration') ||
  s.heroImageAlt.toLowerCase().includes('cartoon') ||
  s.heroImageAlt.toLowerCase().includes('drawing') ||
  s.heroImageAlt.toLowerCase().includes('watercolour') ||
  s.heroImageAlt.toLowerCase().includes('silhouette') ||
  s.heroImageAlt.toLowerCase().includes('line art')
);

console.log(`Found ${nonPhotos.length} stories with illustrations/clipart/drawings:`);
const byCat = {};
nonPhotos.forEach(s => {
  byCat[s.category] = byCat[s.category] || [];
  byCat[s.category].push(s);
});

for (const cat in byCat) {
  console.log(`\n=== CATEGORY: ${cat} (${byCat[cat].length} items) ===`);
  byCat[cat].forEach(s => {
    console.log(`- [${s.id}] "${s.title}" (${s.section})`);
    console.log(`  Hero: ${s.heroImage}`);
    console.log(`  Alt: ${s.heroImageAlt}`);
    console.log(`  Source: ${s.heroImageSource}`);
  });
}
