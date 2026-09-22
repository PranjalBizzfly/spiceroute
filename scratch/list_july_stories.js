const fs = require('fs');
const c = fs.readFileSync('src/data/stories.ts', 'utf8');

const blocks = c.split(/\{\s*id:\s*"/).slice(1);
for (const b of blocks) {
  const getF = (f) => { const m = new RegExp(f + ':\\s*"([^"]*)"').exec(b); return m ? m[1] : ''; };
  if (getF('editionSlug') === 'july-2026') {
    console.log(getF('id'), '|', getF('title'), '|', getF('heroImage'), '|', getF('heroImageAlt'));
  }
}
