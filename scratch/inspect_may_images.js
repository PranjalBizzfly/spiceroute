const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('.qa/extract/img/may-2026/index.json', 'utf8'));
console.log('Total images in May 2026:', idx.length);
idx.filter(x => x.width > 400).forEach(x => {
  console.log('page:', x.page, '| file:', x.file, '| size:', x.width, 'x', x.height);
});
