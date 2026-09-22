const fs = require('fs');
const path = require('path');

const rendersDir = '.qa/extract/renders';
const renders = fs.readdirSync(rendersDir).filter(f => f.includes('hyderabad') || f.includes('april-2026-p26') || f.includes('p27'));
console.log('Renders:', renders);

// Search blocks for charminar or hyderabad
const blocksDir = '.qa/extract/blocks';
const blocks = fs.readdirSync(blocksDir);
for (const b of blocks) {
  const c = fs.readFileSync(path.join(blocksDir, b), 'utf8');
  if (c.toLowerCase().includes('charminar') || c.toLowerCase().includes('golconda') || c.toLowerCase().includes('hussain sagar')) {
    console.log('Block with Charminar/Golconda:', b);
  }
}
