const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const regex = /(?:src|heroImage|title|alt|caption):\s*"([^"]*(?:rhino|kaziranga|assam|elephant|deer|jungle|national park|wildlife)[^"]*)"/gi;
let m;
const matches = new Set();
while ((m = regex.exec(c)) !== null) {
  matches.add(m[0]);
}
console.log([...matches].join('\n'));
