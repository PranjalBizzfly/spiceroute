const fs = require('fs');

const issues = [
  'september-2026',
  'august-2026',
  'july-2026',
  'june-2026',
  'may-2026',
  'march-2026',
  'may-2024',
  'april-2024',
  'march-2024',
  'february-2024'
];

for (const issue of issues) {
  const dir = `.qa/extract/img/${issue}`;
  if (fs.existsSync(dir)) {
    const idxFile = `${dir}/index.json`;
    if (fs.existsSync(idxFile)) {
      const idx = JSON.parse(fs.readFileSync(idxFile, 'utf8'));
      // Filter for early pages (p1 to p10) where Welcome Aboard / SpiceJet features appear
      const early = idx.filter(x => x.page <= 10 && x.width > 200);
      console.log(`=== ${issue} (early pages p1-p10) ===`);
      early.forEach(x => console.log(`  p${x.page} | ${x.file} | ${x.width}x${x.height}`));
    }
  }
}
