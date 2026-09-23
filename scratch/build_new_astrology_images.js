const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/Dreams/.gemini/antigravity-ide/brain/891f243e-91c9-46ef-b629-d9ee37d0a6bc';
const targetDir = path.resolve('./public/images/stories');

const mappings = [
  {
    src: 'astro_september_2026_1790147433554.jpg',
    target: 'astrology-predictions-september-2026.webp'
  },
  {
    src: 'astro_august_2026_1790147460781.jpg',
    target: 'astrology-predictions-august-2026.webp'
  },
  {
    src: 'astro_july_2026_1790147485146.jpg',
    target: 'astrology-predictions-july-2026.webp'
  },
  {
    src: 'astro_june_2026_1790147506472.jpg',
    target: 'astrology-predictions-june-2026.webp'
  },
  {
    src: 'astro_may_2026_1790147526094.jpg',
    target: 'astrology-predictions-may-2026.webp'
  },
  {
    src: 'astro_april_2026_1790147641996.jpg',
    target: 'astrology-predictions-april-2026.webp'
  },
  {
    src: 'astro_march_2026_1790147669509.jpg',
    target: 'astrology-predictions-march-2026.webp'
  },
  {
    src: 'astro_forecast_may_2024_1790147699073.jpg',
    target: 'astrology-forecast-may-2024.webp'
  },
  {
    src: 'astro_forecast_april_2024_1790147725252.jpg',
    target: 'astrology-forecast-april-2024.webp'
  },
  {
    src: 'astro_forecast_march_2024_1790147819929.jpg',
    target: 'astrology-forecast-march-2024.webp'
  },
  {
    src: 'astro_forecast_february_2024_1790147844474.jpg',
    target: 'astrology-forecast-february-2024.webp'
  },
  {
    src: 'astro_category_cover_1790147879542.jpg',
    target: 'astrology-predictions-category.webp'
  }
];

async function run() {
  for (const item of mappings) {
    const srcPath = path.join(brainDir, item.src);
    const targetPath = path.join(targetDir, item.target);
    const buffer = await sharp(srcPath)
      .resize(1400, 1400, { fit: 'cover' })
      .webp({ quality: 90, effort: 6 })
      .toBuffer();
    fs.writeFileSync(targetPath, buffer);
    console.log(`Generated ${item.target} (${buffer.length} bytes)`);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
