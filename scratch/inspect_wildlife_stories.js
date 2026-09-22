const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const targetIds = [
  'saving-the-greater-one-horned-rhino',
  'world-environment-day-facts-and-figures',
  'international-day-for-biological-diversity',
  'world-earth-day-facts-and-figures'
];

targetIds.forEach(id => {
  const idx = c.indexOf(`id: "${id}"`);
  if (idx !== -1) {
    console.log('====================================');
    console.log(c.slice(idx, idx + 1200));
  }
});
