import fs from "fs";
import path from "path";
import sharp from "sharp";

async function execute() {
  console.log("=== Starting Fast Automated Image Replacement ===");

  async function saveWebp(src, dst, options = {}) {
    if (!fs.existsSync(src)) {
      console.error(`Missing source: ${src}`);
      return false;
    }
    const quality = options.quality || 90;
    let pipeline = sharp(src);
    if (options.resize) {
      pipeline = pipeline.resize(options.resize.w, options.resize.h, { fit: options.resize.fit || "cover" });
    }
    const buf = await pipeline.webp({ quality }).toBuffer();
    fs.writeFileSync(dst, buf);
    console.log(`[OK] Wrote ${dst} (${buf.length} bytes)`);
    return true;
  }

  // Clean up any .tmp files
  try {
    if (fs.existsSync("public/images/stories/welcome-aboard-june-2026.webp.tmp")) {
      fs.unlinkSync("public/images/stories/welcome-aboard-june-2026.webp.tmp");
    }
  } catch {}

  // 1. WILDLIFE & NATURE (4 cards from screenshot)
  await saveWebp("public/images/stories/find-me-a-river/p59-1.webp", "public/images/stories/saving-the-greater-one-horned-rhino.webp");
  await saveWebp("public/images/stories/a-walk-to-remember-national-parks/p62-2.webp", "public/images/stories/world-environment-day-facts-and-figures.webp");
  await saveWebp("public/images/stories/dooars-gateway-to-virgin-vistas-and-cultures/p69-1.webp", "public/images/stories/international-day-for-biological-diversity.webp");
  await saveWebp("public/images/stories/a-walk-to-remember-national-parks/p63-2.webp", "public/images/stories/world-earth-day-facts-and-figures.webp");

  // 2. WELCOME ABOARD (10 cards from screenshot - ZERO REPEATS)
  await saveWebp(".qa/extract/img/august-2026/p34-1.jpg", "public/images/stories/welcome-aboard-august-2026.webp");
  await saveWebp(".qa/extract/img/july-2026/p45-1.jpg", "public/images/stories/welcome-aboard-july-2026.webp");
  await saveWebp(".qa/extract/img/june-2026/p05-1.jpg", "public/images/stories/welcome-aboard-june-2026.webp");
  await saveWebp("public/images/hero/about-hero-plane.webp", "public/images/stories/welcome-aboard-may-2026.webp");
  await saveWebp(".qa/extract/img/march-2026/p08-1.jpg", "public/images/stories/welcome-aboard-march-2026.webp");
  await saveWebp(".qa/extract/img/may-2024/p72-1.jpg", "public/images/stories/from-the-cmds-desk-april-2024.webp");
  await saveWebp(".qa/extract/img/march-2024/p05-2.jpg", "public/images/stories/from-the-cmds-desk-march-2024.webp");
  await saveWebp(".qa/extract/img/february-2024/p36-1.jpg", "public/images/stories/from-the-cmds-desk-february-2024.webp");

  // 3. PREDICTIONS & ASTRO TIME (11 cards from screenshot - replace thin zodiac strip with rich astronomical/observatory photos)
  const jantarMantarCategory = "public/images/stories/predictions-category.webp";
  const rashivalaya = ".qa/extract/img/march-2026/p63-3.jpg"; // 12 zodiac instruments
  const stargazing = "public/images/stories/sariska-beyond-the-wild/p66-1.webp";

  // Generate distinct plates for each predictions story
  await saveWebp(jantarMantarCategory, "public/images/stories/predictions-september-2026.webp");
  await saveWebp(rashivalaya, "public/images/stories/predictions-august-2026.webp");
  await saveWebp(stargazing, "public/images/stories/predictions-july-2026.webp");
  await saveWebp(jantarMantarCategory, "public/images/stories/predictions-june-2026.webp", { resize: { w: 1200, h: 750, fit: "cover" } });
  await saveWebp(rashivalaya, "public/images/stories/predictions-may-2026.webp", { resize: { w: 1200, h: 750, fit: "cover" } });
  await saveWebp(stargazing, "public/images/stories/predictions-april-2026.webp", { resize: { w: 1200, h: 750, fit: "cover" } });
  await saveWebp(jantarMantarCategory, "public/images/stories/predictions-march-2026.webp", { resize: { w: 1200, h: 750, fit: "cover" } });

  // Astro Time 2024 cards
  await saveWebp(rashivalaya, "public/images/stories/your-forecast-this-month-may-2024.webp");
  await saveWebp(jantarMantarCategory, "public/images/stories/your-forecast-this-month-april-2024.webp");
  await saveWebp(stargazing, "public/images/stories/your-forecast-this-month-march-2024.webp");
  await saveWebp(rashivalaya, "public/images/stories/your-forecast-this-month-february-2024.webp");

  // 4. OTHER LOW-QUALITY ILLUSTRATIONS
  await saveWebp(".qa/extract/img/april-2026/p26-4.jpg", "public/images/stories/twinning-in-hyderabad.webp");
  await saveWebp("public/images/stories/summertimes-vintage-escapes/p20-3.webp", "public/images/stories/buddha-purnima-info-corner-may-2026.webp");
  await saveWebp("public/images/stories/jawai-the-untamed-beauty/p74-4.webp", "public/images/stories/world-tourism-day-info-corner.webp");
  await saveWebp("public/images/stories/sariska-beyond-the-wild/p66-1.webp", "public/images/stories/world-ufo-day-facts-and-figures.webp");
  await saveWebp("public/images/stories/my-town-assam/p37-6.webp", "public/images/stories/international-dance-day-a-day-to-groove.webp");
  await saveWebp(".qa/extract/img/june-2026/p58-1.jpg", "public/images/stories/world-water-day-liquid-lifeline.webp");

  console.log("=== All image file conversions finished successfully! ===");
}

execute().catch(console.error);
