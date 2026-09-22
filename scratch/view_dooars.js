const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const idx = c.indexOf('dooars-gateway-to-virgin-vistas-and-cultures');
const gIdx = c.indexOf('gallery:', idx);
console.log(c.slice(idx, gIdx + 2000));
