const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/Dreams/.gemini/antigravity-ide/brain/891f243e-91c9-46ef-b629-d9ee37d0a6bc';
const targetDir = path.resolve('./public/images/stories');

const mappings = [
  {
    src: 'astro_september_2026_1790147433554.jpg',
    targets: ['predictions-september-2026.webp', 'predictions-september-2026-v2.webp']
  },
  {
    src: 'astro_august_2026_1790147460781.jpg',
    targets: ['predictions-august-2026.webp', 'predictions-august-2026-v2.webp']
  },
  {
    src: 'astro_july_2026_1790147485146.jpg',
    targets: ['predictions-july-2026.webp', 'predictions-july-2026-v2.webp']
  },
  {
    src: 'astro_june_2026_1790147506472.jpg',
    targets: ['predictions-june-2026.webp', 'predictions-june-2026-v2.webp']
  },
  {
    src: 'astro_may_2026_1790147526094.jpg',
    targets: ['predictions-may-2026.webp', 'predictions-may-2026-v2.webp']
  },
  {
    src: 'astro_april_2026_1790147641996.jpg',
    targets: ['predictions-april-2026.webp', 'predictions-april-2026-v2.webp']
  },
  {
    src: 'astro_march_2026_1790147669509.jpg',
    targets: ['predictions-march-2026.webp', 'predictions-march-2026-v2.webp']
  },
  {
    src: 'astro_forecast_may_2024_1790147699073.jpg',
    targets: ['your-forecast-this-month-may-2024.webp', 'your-forecast-this-month-may-2024-v2.webp']
  },
  {
    src: 'astro_forecast_april_2024_1790147725252.jpg',
    targets: ['your-forecast-this-month-april-2024.webp', 'your-forecast-this-month-april-2024-v2.webp']
  },
  {
    src: 'astro_forecast_march_2024_1790147819929.jpg',
    targets: ['your-forecast-this-month-march-2024.webp', 'your-forecast-this-month-march-2024-v2.webp']
  },
  {
    src: 'astro_forecast_february_2024_1790147844474.jpg',
    targets: ['your-forecast-this-month-february-2024.webp', 'your-forecast-this-month-february-2024-v2.webp']
  },
  {
    src: 'astro_category_cover_1790147879542.jpg',
    targets: ['predictions-category.webp']
  }
];

async function processAll() {
  for (const item of mappings) {
    const srcPath = path.join(brainDir, item.src);
    if (!fs.existsSync(srcPath)) {
      console.error(`Source not found: ${srcPath}`);
      continue;
    }
    const buffer = await sharp(srcPath)
      .resize(1400, 1400, { fit: 'cover' })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();

    for (const target of item.targets) {
      const targetPath = path.join(targetDir, target);
      fs.writeFileSync(targetPath, buffer);
      console.log(`Wrote ${targetPath} (${buffer.length} bytes)`);
    }
  }
}

processAll().catch(err => {
  console.error(err);
  process.exit(1);
});
