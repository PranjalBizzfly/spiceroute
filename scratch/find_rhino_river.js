const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const q = "A rhino wading in a wide blue river";
const idx = c.indexOf(q);
if (idx !== -1) {
  console.log(c.slice(Math.max(0, idx - 400), idx + 400));
}
