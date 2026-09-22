const fs = require('fs');
const idx = JSON.parse(fs.readFileSync('.qa/extract/img/april-2026/index.json', 'utf8'));
const p26 = idx.filter(x => x.page === 26);
console.log(p26);
