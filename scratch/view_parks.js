const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const idx = c.indexOf('a-walk-to-remember-national-parks');
if (idx !== -1) {
  console.log(c.slice(idx, idx + 2500));
}
