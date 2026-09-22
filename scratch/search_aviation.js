const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const regex = /(?:heroImage|src|title|alt):\s*"([^"]*(?:aircraft|plane|crew|spicejet|pilot|cockpit|flight|cabin)[^"]*)"/gi;
let m;
const matches = new Set();
while ((m = regex.exec(c)) !== null) {
  matches.add(m[0]);
}
console.log([...matches].join('\n'));
