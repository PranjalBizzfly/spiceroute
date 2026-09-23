const fs = require('fs');

// 1. Update stories.ts
let storiesContent = fs.readFileSync('./src/data/stories.ts', 'utf8');
const replacements = [
  ['/images/stories/predictions-september-2026.webp', '/images/stories/astrology-predictions-september-2026.webp'],
  ['/images/stories/predictions-august-2026.webp', '/images/stories/astrology-predictions-august-2026.webp'],
  ['/images/stories/predictions-july-2026.webp', '/images/stories/astrology-predictions-july-2026.webp'],
  ['/images/stories/predictions-june-2026.webp', '/images/stories/astrology-predictions-june-2026.webp'],
  ['/images/stories/predictions-may-2026.webp', '/images/stories/astrology-predictions-may-2026.webp'],
  ['/images/stories/predictions-april-2026.webp', '/images/stories/astrology-predictions-april-2026.webp'],
  ['/images/stories/predictions-march-2026.webp', '/images/stories/astrology-predictions-march-2026.webp'],
  ['/images/stories/your-forecast-this-month-may-2024.webp', '/images/stories/astrology-forecast-may-2024.webp'],
  ['/images/stories/your-forecast-this-month-april-2024.webp', '/images/stories/astrology-forecast-april-2024.webp'],
  ['/images/stories/your-forecast-this-month-march-2024.webp', '/images/stories/astrology-forecast-march-2024.webp'],
  ['/images/stories/your-forecast-this-month-february-2024.webp', '/images/stories/astrology-forecast-february-2024.webp']
];

for (const [from, to] of replacements) {
  if (!storiesContent.includes(from)) {
    console.error(`Warning: ${from} not found in stories.ts`);
  }
  storiesContent = storiesContent.replaceAll(from, to);
}
fs.writeFileSync('./src/data/stories.ts', storiesContent, 'utf8');
console.log('Updated stories.ts');

// 2. Update page.tsx
let pageContent = fs.readFileSync('./src/app/page.tsx', 'utf8');
pageContent = pageContent.replaceAll(
  '/images/stories/predictions-category.webp',
  '/images/stories/astrology-predictions-category.webp'
);
fs.writeFileSync('./src/app/page.tsx', pageContent, 'utf8');
console.log('Updated page.tsx');

// 3. Update imageFocus.ts
let focusContent = fs.readFileSync('./src/lib/imageFocus.ts', 'utf8');
focusContent = focusContent.replaceAll(
  '/images/stories/predictions-category.webp',
  '/images/stories/astrology-predictions-category.webp'
);
for (const [from, to] of replacements) {
  focusContent = focusContent.replaceAll(from, to);
}
fs.writeFileSync('./src/lib/imageFocus.ts', focusContent, 'utf8');
console.log('Updated imageFocus.ts');
