const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const idx = c.indexOf('international-cabin-crew-day-heroes-of-the-sky');
if (idx !== -1) {
  console.log(c.slice(idx, idx + 2000));
}
