const fs = require('fs');
const path = require('path');

const dir = '.qa/extract/blocks';
const files = fs.readdirSync(dir);
for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  if (content.toLowerCase().includes('rhino') || content.toLowerCase().includes('kaziranga')) {
    console.log(file);
    const lines = content.split('\n').filter(l => l.toLowerCase().includes('rhino') || l.toLowerCase().includes('kaziranga'));
    lines.slice(0, 3).forEach(l => console.log('  ', l.trim()));
  }
}
