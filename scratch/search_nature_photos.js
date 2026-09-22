const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const blocks = c.split(/\{\s*id:\s*"/).slice(1);
const photos = [];

for (const b of blocks) {
  const getF = (f) => { const m = new RegExp(f + ':\\s*"([^"]*)"').exec(b); return m ? m[1] : ''; };
  const id = b.slice(0, b.indexOf('"'));
  const title = getF('title');
  const cat = getF('category');
  const heroImage = getF('heroImage');
  const heroImageAlt = getF('heroImageAlt');
  
  if (heroImage && !heroImageAlt.toLowerCase().includes('illustration') && !heroImageAlt.toLowerCase().includes('cartoon')) {
    photos.push({ id, title, cat, heroImage, heroImageAlt, type: 'hero' });
  }

  const galleryMatch = b.match(/gallery:\s*\[([\s\S]*?)\]/);
  if (galleryMatch) {
    const gBlocks = galleryMatch[1].split(/\{\s*src:\s*"/).slice(1);
    for (const gb of gBlocks) {
      const src = gb.slice(0, gb.indexOf('"'));
      const altM = gb.match(/alt:\s*"([^"]*)"/);
      const wM = gb.match(/width:\s*(\d+)/);
      const hM = gb.match(/height:\s*(\d+)/);
      const alt = altM ? altM[1] : '';
      if (!alt.toLowerCase().includes('illustration') && !alt.toLowerCase().includes('cartoon')) {
        photos.push({ 
          id, 
          title, 
          cat, 
          heroImage: src, 
          heroImageAlt: alt, 
          width: wM ? Number(wM[1]) : 0,
          height: hM ? Number(hM[1]) : 0,
          type: 'gallery' 
        });
      }
    }
  }
}

console.log(`Total verified photographs: ${photos.length}`);

// Let's search for nature / environment / forest / earth / trees / river photos
const naturePhotos = photos.filter(p => 
  p.heroImageAlt.toLowerCase().includes('forest') ||
  p.heroImageAlt.toLowerCase().includes('river') ||
  p.heroImageAlt.toLowerCase().includes('tree') ||
  p.heroImageAlt.toLowerCase().includes('green') ||
  p.heroImageAlt.toLowerCase().includes('nature') ||
  p.heroImageAlt.toLowerCase().includes('lake') ||
  p.heroImageAlt.toLowerCase().includes('mountain') ||
  p.heroImageAlt.toLowerCase().includes('hills') ||
  p.heroImageAlt.toLowerCase().includes('valley') ||
  p.heroImageAlt.toLowerCase().includes('wildlife')
);

console.log(`Total nature/landscape photos: ${naturePhotos.length}`);
naturePhotos.slice(0, 35).forEach(p => {
  console.log(`- [${p.id}] ${p.heroImage} (${p.width || 'hero'}x${p.height || ''}) : ${p.heroImageAlt}`);
});
