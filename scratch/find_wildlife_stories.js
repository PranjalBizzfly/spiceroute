const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const blocks = c.split(/\{\s*id:\s*"/).slice(1);
const wildlifeStories = [];

for (const b of blocks) {
  const getF = (f) => { const m = new RegExp(f + ':\\s*"([^"]*)"').exec(b); return m ? m[1] : ''; };
  const id = b.slice(0, b.indexOf('"'));
  const title = getF('title');
  const cat = getF('category');
  const section = getF('section');
  const excerpt = getF('excerpt');
  const heroImage = getF('heroImage');
  const heroImageAlt = getF('heroImageAlt');
  
  const text = `${title} ${section} ${excerpt} ${heroImageAlt}`.toLowerCase();
  if (text.includes('wild') || text.includes('safari') || text.includes('forest') || text.includes('reserve') || text.includes('national park') || text.includes('animal') || text.includes('sanctuary')) {
    wildlifeStories.push({ id, title, cat, section, heroImage, heroImageAlt });
  }
}

console.log('Wildlife/Nature related stories:', wildlifeStories.length);
wildlifeStories.forEach(s => console.log(`[${s.cat}] ${s.title} (${s.id}) -> ${s.heroImage}`));
