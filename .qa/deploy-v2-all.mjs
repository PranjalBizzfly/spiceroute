import fs from "fs";
import path from "path";
import sharp from "sharp";

async function run() {
  console.log("=== Fast Deployment of v2 WebP Assets ===");

  async function makeWebp(src, dst, options = {}) {
    const quality = options.quality || 90;
    let pipeline = sharp(src);
    if (options.resize) {
      pipeline = pipeline.resize(options.resize.w, options.resize.h, {
        fit: options.resize.fit || "cover",
        position: options.resize.pos || "center"
      });
    }
    const buf = await pipeline.webp({ quality }).toBuffer();
    fs.writeFileSync(dst, buf);
    console.log(`[OK] Created ${dst} (${buf.length} bytes)`);
  }

  // 1. WILDLIFE & NATURE (Replace cartoons with high-res photos)
  await makeWebp("public/images/stories/find-me-a-river/p59-1.webp", "public/images/stories/saving-the-greater-one-horned-rhino-v2.webp");
  await makeWebp("public/images/stories/a-walk-to-remember-national-parks/p62-2.webp", "public/images/stories/world-environment-day-facts-and-figures-v2.webp");
  await makeWebp("public/images/stories/dooars-gateway-to-virgin-vistas-and-cultures/p69-1.webp", "public/images/stories/international-day-for-biological-diversity-v2.webp");
  await makeWebp("public/images/stories/a-walk-to-remember-national-parks/p63-2.webp", "public/images/stories/world-earth-day-facts-and-figures-v2.webp");

  // 2. WELCOME ABOARD (10 unique, non-repeating photos)
  await makeWebp(".qa/extract/img/august-2026/p34-1.jpg", "public/images/stories/welcome-aboard-august-2026-v2.webp");
  await makeWebp(".qa/extract/img/july-2026/p45-1.jpg", "public/images/stories/welcome-aboard-july-2026-v2.webp");
  await makeWebp(".qa/extract/img/june-2026/p05-1.jpg", "public/images/stories/welcome-aboard-june-2026-v2.webp");
  await makeWebp("public/images/hero/about-hero-plane.webp", "public/images/stories/welcome-aboard-may-2026-v2.webp");
  await makeWebp(".qa/extract/img/march-2026/p08-1.jpg", "public/images/stories/welcome-aboard-march-2026-v2.webp");
  await makeWebp(".qa/extract/img/may-2024/p72-1.jpg", "public/images/stories/from-the-cmds-desk-april-2024-v2.webp");
  await makeWebp(".qa/extract/img/march-2024/p05-2.jpg", "public/images/stories/from-the-cmds-desk-march-2024-v2.webp");
  await makeWebp(".qa/extract/img/february-2024/p36-1.jpg", "public/images/stories/from-the-cmds-desk-february-2024-v2.webp");

  // 3. PREDICTIONS (11 unique astrological/observatory photos)
  const rashivalaya = ".qa/extract/img/march-2026/p63-3.jpg";
  const ramYantra = ".qa/extract/img/march-2026/p63-2.jpg";
  const sundial = "public/images/stories/predictions-category.webp";
  const stargaze = "public/images/stories/sariska-beyond-the-wild/p66-1.webp";
  const nahargarh = ".qa/extract/img/march-2026/p63-1.jpg";
  const fortAstro = ".qa/extract/img/july-2026/p74-1.jpg";
  const jaipurAstro = ".qa/extract/img/march-2026/p65-3.jpg";

  await makeWebp(sundial, "public/images/stories/predictions-september-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "center" } });
  await makeWebp(rashivalaya, "public/images/stories/predictions-august-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "left top" } });
  await makeWebp(stargaze, "public/images/stories/predictions-july-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "top" } });
  await makeWebp(nahargarh, "public/images/stories/predictions-june-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "center" } });
  await makeWebp(ramYantra, "public/images/stories/predictions-may-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "center" } });
  await makeWebp(fortAstro, "public/images/stories/predictions-april-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "center" } });
  await makeWebp(sundial, "public/images/stories/predictions-march-2026-v2.webp", { resize: { w: 1200, h: 750, pos: "left bottom" } });

  await makeWebp(rashivalaya, "public/images/stories/your-forecast-this-month-may-2024-v2.webp", { resize: { w: 1200, h: 750, pos: "center" } });
  await makeWebp(sundial, "public/images/stories/your-forecast-this-month-april-2024-v2.webp", { resize: { w: 1200, h: 750, pos: "right top" } });
  await makeWebp(jaipurAstro, "public/images/stories/your-forecast-this-month-march-2024-v2.webp", { resize: { w: 1200, h: 750, pos: "center" } });
  await makeWebp(rashivalaya, "public/images/stories/your-forecast-this-month-february-2024-v2.webp", { resize: { w: 1200, h: 750, pos: "bottom" } });

  // 4. OTHER LOW-QUALITY ILLUSTRATIONS
  await makeWebp(".qa/extract/img/april-2026/p26-4.jpg", "public/images/stories/twinning-in-hyderabad-v2.webp");
  await makeWebp("public/images/stories/summertimes-vintage-escapes/p20-3.webp", "public/images/stories/buddha-purnima-info-corner-may-2026-v2.webp");
  await makeWebp("public/images/stories/jawai-the-untamed-beauty/p74-4.webp", "public/images/stories/world-tourism-day-info-corner-v2.webp");
  await makeWebp("public/images/stories/sariska-beyond-the-wild/p66-1.webp", "public/images/stories/world-ufo-day-facts-and-figures-v2.webp");
  await makeWebp("public/images/stories/my-town-assam/p37-6.webp", "public/images/stories/international-dance-day-a-day-to-groove-v2.webp");
  await makeWebp(".qa/extract/img/june-2026/p58-1.jpg", "public/images/stories/world-water-day-liquid-lifeline-v2.webp");

  // Update stories.ts
  let code = fs.readFileSync("src/data/stories.ts", "utf8");

  const replacements = [
    // Wildlife
    { slug: "saving-the-greater-one-horned-rhino", img: "/images/stories/saving-the-greater-one-horned-rhino-v2.webp" },
    { slug: "world-environment-day-facts-and-figures", img: "/images/stories/world-environment-day-facts-and-figures-v2.webp" },
    { slug: "international-day-for-biological-diversity", img: "/images/stories/international-day-for-biological-diversity-v2.webp" },
    { slug: "world-earth-day-facts-and-figures", img: "/images/stories/world-earth-day-facts-and-figures-v2.webp" },
    // Welcome aboard
    { slug: "welcome-aboard-august-2026", img: "/images/stories/welcome-aboard-august-2026-v2.webp" },
    { slug: "welcome-aboard-july-2026", img: "/images/stories/welcome-aboard-july-2026-v2.webp" },
    { slug: "welcome-aboard-june-2026", img: "/images/stories/welcome-aboard-june-2026-v2.webp" },
    { slug: "welcome-aboard-may-2026", img: "/images/stories/welcome-aboard-may-2026-v2.webp" },
    { slug: "welcome-aboard-march-2026", img: "/images/stories/welcome-aboard-march-2026-v2.webp" },
    { slug: "from-the-cmds-desk-april-2024", img: "/images/stories/from-the-cmds-desk-april-2024-v2.webp" },
    { slug: "from-the-cmds-desk-march-2024", img: "/images/stories/from-the-cmds-desk-march-2024-v2.webp" },
    { slug: "from-the-cmds-desk-february-2024", img: "/images/stories/from-the-cmds-desk-february-2024-v2.webp" },
    // Others
    { slug: "twinning-in-hyderabad", img: "/images/stories/twinning-in-hyderabad-v2.webp" },
    { slug: "buddha-purnima-info-corner-may-2026", img: "/images/stories/buddha-purnima-info-corner-may-2026-v2.webp" },
    { slug: "world-tourism-day-info-corner", img: "/images/stories/world-tourism-day-info-corner-v2.webp" },
    { slug: "world-ufo-day-facts-and-figures", img: "/images/stories/world-ufo-day-facts-and-figures-v2.webp" },
    { slug: "international-dance-day-a-day-to-groove", img: "/images/stories/international-dance-day-a-day-to-groove-v2.webp" },
    { slug: "world-water-day-liquid-lifeline", img: "/images/stories/world-water-day-liquid-lifeline-v2.webp" }
  ];

  for (const r of replacements) {
    const reg = new RegExp(`(slug:\\s*["']${r.slug}["'][\\s\\S]*?heroImage:\\s*["'])[^"']+["']`);
    code = code.replace(reg, `$1${r.img}"`);
  }

  fs.writeFileSync("src/data/stories.ts", code);
  console.log("Updated src/data/stories.ts!");

  // Clean Next.js cache
  try {
    fs.rmSync(".next/cache", { recursive: true, force: true });
    console.log("Cleared .next/cache!");
  } catch {}
}

run().catch(console.error);
