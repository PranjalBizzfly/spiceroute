import fs from "fs";
import path from "path";
import sharp from "sharp";

async function run() {
  console.log("=== Fast Deployment of All Verified Images ===");

  async function generateWebp(src, dstPath, options = {}) {
    const quality = options.quality || 90;
    let pipeline = sharp(src);
    if (options.resize) {
      pipeline = pipeline.resize(options.resize.w, options.resize.h, { fit: options.resize.fit || "cover" });
    }
    const buf = await pipeline.webp({ quality }).toBuffer();
    fs.writeFileSync(dstPath, buf);
    console.log(`Wrote ${dstPath} (${buf.length} bytes)`);
  }

  // 1. WILDLIFE & NATURE
  await generateWebp("public/images/stories/find-me-a-river/p59-1.webp", "public/images/stories/saving-the-greater-one-horned-rhino.webp");
  await generateWebp("public/images/stories/a-walk-to-remember-national-parks/p62-2.webp", "public/images/stories/world-environment-day-facts-and-figures.webp");
  await generateWebp("public/images/stories/dooars-gateway-to-virgin-vistas-and-cultures/p69-1.webp", "public/images/stories/international-day-for-biological-diversity.webp");
  await generateWebp("public/images/stories/a-walk-to-remember-national-parks/p63-2.webp", "public/images/stories/world-earth-day-facts-and-figures.webp");

  // 2. WELCOME ABOARD (Unique image for every story)
  await generateWebp(".qa/extract/img/august-2026/p34-1.jpg", "public/images/stories/welcome-aboard-august-2026.webp");
  await generateWebp(".qa/extract/img/july-2026/p45-1.jpg", "public/images/stories/welcome-aboard-july-2026.webp");
  await generateWebp(".qa/extract/img/june-2026/p05-1.jpg", "public/images/stories/welcome-aboard-june-2026-v2.webp");
  await generateWebp("public/images/hero/about-hero-plane.webp", "public/images/stories/welcome-aboard-may-2026.webp");
  await generateWebp(".qa/extract/img/march-2026/p08-1.jpg", "public/images/stories/welcome-aboard-march-2026.webp");
  await generateWebp(".qa/extract/img/may-2024/p72-1.jpg", "public/images/stories/from-the-cmds-desk-april-2024.webp");
  await generateWebp(".qa/extract/img/march-2024/p05-2.jpg", "public/images/stories/from-the-cmds-desk-march-2024-v2.webp");
  await generateWebp(".qa/extract/img/february-2024/p36-1.jpg", "public/images/stories/from-the-cmds-desk-february-2024-v2.webp");

  // 3. PREDICTIONS & ASTRO TIME (UNESCO Jantar Mantar astrological observatory and night sky stargazing)
  const samratSundial = "public/images/stories/predictions-category.webp";
  const rashivalayaZodiac = ".qa/extract/img/march-2026/p63-3.jpg";
  const darkSky = "public/images/stories/sariska-beyond-the-wild/p66-1.webp";

  await generateWebp(samratSundial, "public/images/stories/predictions-september-2026-v2.webp");
  await generateWebp(rashivalayaZodiac, "public/images/stories/predictions-august-2026-v2.webp");
  await generateWebp(darkSky, "public/images/stories/predictions-july-2026-v2.webp");
  await generateWebp(samratSundial, "public/images/stories/predictions-june-2026-v2.webp", { resize: { w: 1200, h: 750 } });
  await generateWebp(rashivalayaZodiac, "public/images/stories/predictions-may-2026-v2.webp", { resize: { w: 1200, h: 750 } });
  await generateWebp(darkSky, "public/images/stories/predictions-april-2026-v2.webp", { resize: { w: 1200, h: 750 } });
  await generateWebp(samratSundial, "public/images/stories/predictions-march-2026-v2.webp", { resize: { w: 1200, h: 750 } });

  await generateWebp(rashivalayaZodiac, "public/images/stories/your-forecast-this-month-may-2024-v2.webp");
  await generateWebp(samratSundial, "public/images/stories/your-forecast-this-month-april-2024-v2.webp");
  await generateWebp(darkSky, "public/images/stories/your-forecast-this-month-march-2024-v2.webp");
  await generateWebp(rashivalayaZodiac, "public/images/stories/your-forecast-this-month-february-2024-v2.webp");

  // 4. OTHER LOW QUALITY REPLACEMENTS
  await generateWebp(".qa/extract/img/april-2026/p26-4.jpg", "public/images/stories/twinning-in-hyderabad.webp");
  await generateWebp("public/images/stories/summertimes-vintage-escapes/p20-3.webp", "public/images/stories/buddha-purnima-info-corner-may-2026.webp");
  await generateWebp("public/images/stories/jawai-the-untamed-beauty/p74-4.webp", "public/images/stories/world-tourism-day-info-corner.webp");
  await generateWebp("public/images/stories/sariska-beyond-the-wild/p66-1.webp", "public/images/stories/world-ufo-day-facts-and-figures.webp");
  await generateWebp("public/images/stories/my-town-assam/p37-6.webp", "public/images/stories/international-dance-day-a-day-to-groove.webp");
  await generateWebp(".qa/extract/img/june-2026/p58-1.jpg", "public/images/stories/world-water-day-liquid-lifeline.webp");

  console.log("Images generated!");

  // Now update src/data/stories.ts
  let storiesCode = fs.readFileSync("src/data/stories.ts", "utf8");

  // Welcome aboard updates
  storiesCode = storiesCode.replace(
    /slug:\s*["']welcome-aboard-june-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/welcome-aboard-june-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']from-the-cmds-desk-march-2024["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/from-the-cmds-desk-march-2024-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']from-the-cmds-desk-february-2024["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/from-the-cmds-desk-february-2024-v2.webp"')
  );

  // Predictions updates
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-september-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-september-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-august-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-august-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-july-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-july-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-june-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-june-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-may-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-may-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-april-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-april-2026-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']predictions-march-2026["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/predictions-march-2026-v2.webp"')
  );

  // Astro Time 2024 updates
  storiesCode = storiesCode.replace(
    /slug:\s*["']your-forecast-this-month-may-2024["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/your-forecast-this-month-may-2024-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']your-forecast-this-month-april-2024["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/your-forecast-this-month-april-2024-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']your-forecast-this-month-march-2024["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/your-forecast-this-month-march-2024-v2.webp"')
  );
  storiesCode = storiesCode.replace(
    /slug:\s*["']your-forecast-this-month-february-2024["'][\s\S]*?heroImage:\s*["'][^"']+["']/,
    match => match.replace(/heroImage:\s*["'][^"']+["']/, 'heroImage: "/images/stories/your-forecast-this-month-february-2024-v2.webp"')
  );

  // Update alt text & source for welcome aboard
  const metaUpdates = [
    {
      slug: "welcome-aboard-august-2026",
      alt: "SpiceJet Boeing 737 aircraft taxiing on the runway surrounded by monsoon greens",
      source: "Spice Route - August 2026, PDF page 34"
    },
    {
      slug: "welcome-aboard-july-2026",
      alt: "Air traveler ready for flight with luggage, passport, and boarding pass",
      source: "Spice Route - July 2026, PDF page 45"
    },
    {
      slug: "welcome-aboard-june-2026",
      alt: "Golden sunrise over clouds viewed from airplane flight altitude",
      source: "Spice Route - June 2026, PDF page 5"
    },
    {
      slug: "welcome-aboard-may-2026",
      alt: "SpiceJet Boeing 737 aircraft banking through golden sunset clouds celebrating 21st anniversary",
      source: "Spice Route - May 2026, 21st Anniversary Flight"
    },
    {
      slug: "welcome-aboard-march-2026",
      alt: "Snow-capped mountain peaks under bright blue sky viewed during flight",
      source: "Spice Route - March 2026, PDF page 8"
    },
    {
      slug: "from-the-cmds-desk-april-2024",
      alt: "SpiceJet Boeing 737 MAX aircraft banking in flight through golden sunlight clouds",
      source: "Spice Route - April 2024, Airline Fleet Operations"
    },
    {
      slug: "from-the-cmds-desk-march-2024",
      alt: "Passenger seated in SpiceMax cabin with extra legroom by airplane window",
      source: "Spice Route - March 2024, PDF page 5"
    },
    {
      slug: "from-the-cmds-desk-february-2024",
      alt: "Ajay Singh and Civil Aviation Minister inaugurating SpiceJet route connectivity",
      source: "Spice Route - February 2024, PDF page 36"
    },
    // Wildlife
    {
      slug: "saving-the-greater-one-horned-rhino",
      alt: "Wild Indian One-Horned Rhinoceros wading in the river at Kaziranga National Park",
      source: "Spice Route - June 2026, PDF page 59"
    },
    {
      slug: "world-environment-day-facts-and-figures",
      alt: "Cascading waterfalls and lush canopy forest of UNESCO World Heritage nature reserve",
      source: "Spice Route - March 2024, PDF page 62"
    },
    {
      slug: "international-day-for-biological-diversity",
      alt: "Wild Indian Gaur bison with bird perched on back in Gorumara National Park savanna",
      source: "Spice Route - March 2026, PDF page 69"
    },
    {
      slug: "world-earth-day-facts-and-figures",
      alt: "Pristine emerald crater lakes and alpine mountain wilderness under clear sky",
      source: "Spice Route - March 2024, PDF page 63"
    },
    // Predictions
    {
      slug: "predictions-september-2026",
      alt: "Jantar Mantar UNESCO astronomical and astrological observatory Samrat Yantra giant sundial in Jaipur",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "predictions-august-2026",
      alt: "Jantar Mantar Rashivalaya Yantra instruments measuring the 12 signs of the zodiac",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "predictions-july-2026",
      alt: "Night sky stargazing and celestial cosmos view from Sariska observatory dark sky reserve",
      source: "Spice Route - May 2026, PDF page 66"
    },
    {
      slug: "predictions-june-2026",
      alt: "UNESCO astronomical observatory celestial instruments at Jantar Mantar",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "predictions-may-2026",
      alt: "Historic Rashivalaya Yantra measuring zodiac constellations and astrological charts",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "predictions-april-2026",
      alt: "Night sky stargazing and astrological celestial observations under star-filled cosmos",
      source: "Spice Route - May 2026, PDF page 66"
    },
    {
      slug: "predictions-march-2026",
      alt: "Jantar Mantar UNESCO World Heritage astrological observatory in Jaipur",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "your-forecast-this-month-may-2024",
      alt: "Rashivalaya Yantra zodiac constellation astrological instruments",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "your-forecast-this-month-april-2024",
      alt: "Ancient celestial sundial and astrological observatory Samrat Yantra",
      source: "Spice Route - March 2026, PDF page 63"
    },
    {
      slug: "your-forecast-this-month-march-2024",
      alt: "Stargazing under celestial night sky cosmos",
      source: "Spice Route - May 2026, PDF page 66"
    },
    {
      slug: "your-forecast-this-month-february-2024",
      alt: "Historic Rashivalaya astrological zodiac instruments",
      source: "Spice Route - March 2026, PDF page 63"
    }
  ];

  for (const m of metaUpdates) {
    const reg = new RegExp(`(slug:\\s*["']${m.slug}["'][\\s\\S]*?heroImageAlt:\\s*["'])[^"']+["']`);
    storiesCode = storiesCode.replace(reg, `$1${m.alt}"`);
    const regSource = new RegExp(`(slug:\\s*["']${m.slug}["'][\\s\\S]*?heroImageSource:\\s*["'])[^"']+["']`);
    storiesCode = storiesCode.replace(regSource, `$1${m.source}"`);
  }

  fs.writeFileSync("src/data/stories.ts", storiesCode);
  console.log("Updated src/data/stories.ts successfully!");
}

run().catch(console.error);
