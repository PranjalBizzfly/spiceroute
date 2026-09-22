const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const idx = c.indexOf('jawai-the-untamed-beauty');
const gIdx = c.indexOf('gallery:', idx);
console.log(c.slice(gIdx, gIdx + 2000));
