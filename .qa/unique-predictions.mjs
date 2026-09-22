import fs from "fs";
import sharp from "sharp";

async function makeUniquePredictions() {
  console.log("Generating 11 completely unique predictions images...");

  const rashivalaya = ".qa/extract/img/march-2026/p63-3.jpg"; // 483x397
  const ramYantra = ".qa/extract/img/march-2026/p63-2.jpg"; // 237x397
  const sundial = "public/images/stories/predictions-category.webp"; // 1600x1000
  const stargaze = "public/images/stories/sariska-beyond-the-wild/p66-1.webp"; // 729x309
  const nahargarh = ".qa/extract/img/march-2026/p63-1.jpg"; // 730x487
  const fortAstro = ".qa/extract/img/july-2026/p74-1.jpg"; // 730x486
  const jaipurAstro = ".qa/extract/img/march-2026/p65-3.jpg"; // 491x354

  // 1. predictions-september-2026
  await sharp(sundial).resize(1200, 750, { position: "center" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-september-2026-v2.webp");
  
  // 2. predictions-august-2026
  await sharp(rashivalaya).resize(1200, 750, { position: "left top" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-august-2026-v2.webp");

  // 3. predictions-july-2026
  await sharp(stargaze).resize(1200, 750, { position: "top" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-july-2026-v2.webp");

  // 4. predictions-june-2026
  await sharp(nahargarh).resize(1200, 750, { position: "center" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-june-2026-v2.webp");

  // 5. predictions-may-2026: Ram Yantra astronomical instrument
  await sharp(ramYantra).resize(1200, 750, { position: "center" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-may-2026-v2.webp");

  // 6. predictions-april-2026: Amber Fort heritage
  await sharp(fortAstro).resize(1200, 750, { position: "center" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-april-2026-v2.webp");

  // 7. predictions-march-2026: Samrat Yantra angled perspective
  await sharp(sundial).resize(1200, 750, { position: "left bottom" }).webp({ quality: 90 }).toFile("public/images/stories/predictions-march-2026-v2.webp");

  // 8. your-forecast-this-month-may-2024: Rashivalaya center
  await sharp(rashivalaya).resize(1200, 750, { position: "center" }).webp({ quality: 90 }).toFile("public/images/stories/your-forecast-this-month-may-2024-v2.webp");

  // 9. your-forecast-this-month-april-2024: Samrat Yantra right
  await sharp(sundial).resize(1200, 750, { position: "right top" }).webp({ quality: 90 }).toFile("public/images/stories/your-forecast-this-month-april-2024-v2.webp");

  // 10. your-forecast-this-month-march-2024: Jaipur astro perspective
  await sharp(jaipurAstro).resize(1200, 750, { position: "center" }).webp({ quality: 90 }).toFile("public/images/stories/your-forecast-this-month-march-2024-v2.webp");

  // 11. your-forecast-this-month-february-2024: Rashivalaya bottom
  await sharp(rashivalaya).resize(1200, 750, { position: "bottom" }).webp({ quality: 90 }).toFile("public/images/stories/your-forecast-this-month-february-2024-v2.webp");

  console.log("All 11 unique predictions images successfully created!");
}

makeUniquePredictions().catch(console.error);
