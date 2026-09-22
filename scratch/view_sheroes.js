const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const idx = c.indexOf('unsung-sheroes');
if (idx !== -1) {
  console.log(c.slice(idx, idx + 2000));
}
