const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

// Let's parse all story blocks in stories.ts
// We can use a regex to extract { id, title, section, category, date, heroImage, heroImageAlt, heroImageSource, gallery }
const storyBlocks = c.split(/\{\s*id:\s*"/).slice(1);

const parsed = [];
for (const block of storyBlocks) {
  const id = block.slice(0, block.indexOf('"'));
  const getField = (field) => {
    const m = new RegExp(field + ':\\s*"([^"]*)"').exec(block);
    return m ? m[1] : '';
  };
  const title = getField('title');
  const section = getField('section');
  const category = getField('category');
  const date = getField('date');
  const heroImage = getField('heroImage');
  const heroImageAlt = getField('heroImageAlt');
  const heroImageSource = getField('heroImageSource');
  
  parsed.push({ id, title, section, category, date, heroImage, heroImageAlt, heroImageSource, block });
}

console.log('Total stories:', parsed.length);

// Let's check stories where heroImageAlt contains "Illustration" or heroImage contains cartoon/illustration keywords
const illustrations = parsed.filter(s => 
  s.heroImageAlt.toLowerCase().includes('illustration') ||
  s.heroImage.toLowerCase().includes('vector') ||
  s.heroImage.toLowerCase().includes('clipart') ||
  s.heroImageAlt.toLowerCase().includes('cartoon') ||
  s.heroImageAlt.toLowerCase().includes('drawing') ||
  s.section.toLowerCase().includes('facts and figures') ||
  s.section.toLowerCase().includes('info corner')
);

console.log('Stories with illustration/facts and figures hero images:', illustrations.length);
illustrations.forEach(s => {
  console.log(`[${s.category}] "${s.title}" (${s.date})`);
  console.log(`  Hero: ${s.heroImage}`);
  console.log(`  Alt: ${s.heroImageAlt}`);
  console.log(`  Source: ${s.heroImageSource}`);
  console.log('---');
});
