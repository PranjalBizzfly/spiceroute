import fs from "fs";
import path from "path";
import sharp from "sharp";

async function run() {
  console.log("Applying all image replacements...");

  // 1. Wildlife & Nature replacements
  const wildlife = [
    {
      src: "public/images/stories/find-me-a-river/p59-1.webp",
      dst: "public/images/stories/saving-the-greater-one-horned-rhino.webp",
      quality: 90
    },
    {
      src: "public/images/stories/a-walk-to-remember-national-parks/p62-2.webp",
      dst: "public/images/stories/world-environment-day-facts-and-figures.webp",
      quality: 90
    },
    {
      src: "public/images/stories/dooars-gateway-to-virgin-vistas-and-cultures/p69-1.webp",
      dst: "public/images/stories/international-day-for-biological-diversity.webp",
      quality: 90
    },
    {
      src: "public/images/stories/a-walk-to-remember-national-parks/p63-2.webp",
      dst: "public/images/stories/world-earth-day-facts-and-figures.webp",
      quality: 90
    }
  ];

  for (const w of wildlife) {
    if (fs.existsSync(w.src)) {
      await sharp(w.src).webp({ quality: w.quality }).toFile(w.dst + ".tmp");
      fs.renameSync(w.dst + ".tmp", w.dst);
      console.log(`Updated: ${w.dst}`);
    } else {
      console.error(`Missing source: ${w.src}`);
    }
  }

  // 2. Welcome Aboard unique replacements (NO DUPLICATES)
  const welcome = [
    // august-2026: SpiceJet Boeing 737 on taxiway in monsoon greenery
    {
      src: ".qa/extract/img/august-2026/p34-1.jpg",
      dst: "public/images/stories/welcome-aboard-august-2026.webp",
      quality: 90
    },
    // july-2026: Traveler with red suitcase and boarding passes
    {
      src: ".qa/extract/img/july-2026/p45-1.jpg",
      dst: "public/images/stories/welcome-aboard-july-2026.webp",
      quality: 90
    },
    // june-2026: Golden sunrise flight sky above clouds
    {
      src: ".qa/extract/img/june-2026/p05-1.jpg",
      dst: "public/images/stories/welcome-aboard-june-2026.webp",
      quality: 90
    },
    // may-2026: SpiceJet Boeing 737 banking through golden sunset (21st Anniversary Flight)
    {
      src: "public/images/hero/about-hero-plane.webp",
      dst: "public/images/stories/welcome-aboard-may-2026.webp",
      quality: 90
    },
    // march-2026: Snow-capped mountain flight vista
    {
      src: ".qa/extract/img/march-2026/p08-1.jpg",
      dst: "public/images/stories/welcome-aboard-march-2026.webp",
      quality: 90
    },
    // april-2024: Boeing 737 MAX banking through golden clouds
    {
      src: ".qa/extract/img/may-2024/p72-1.jpg",
      dst: "public/images/stories/from-the-cmds-desk-april-2024.webp",
      quality: 90
    },
    // march-2024: Passenger in SpiceMax cabin with extra legroom
    {
      src: ".qa/extract/img/march-2024/p05-2.jpg",
      dst: "public/images/stories/from-the-cmds-desk-march-2024.webp",
      quality: 90
    },
    // february-2024: CMD Ajay Singh & Aviation Minister launching Ayodhya route connectivity
    {
      src: ".qa/extract/img/february-2024/p36-1.jpg",
      dst: "public/images/stories/from-the-cmds-desk-february-2024.webp",
      quality: 90
    }
  ];

  for (const item of welcome) {
    if (fs.existsSync(item.src)) {
      await sharp(item.src).webp({ quality: item.quality }).toFile(item.dst + ".tmp");
      fs.renameSync(item.dst + ".tmp", item.dst);
      console.log(`Updated Welcome Aboard: ${item.dst}`);
    } else {
      console.error(`Missing welcome source: ${item.src}`);
    }
  }

  // 3. Other low-quality illustrations replaced with editorial photographs
  const others = [
    // Birla Mandir on hill
    {
      src: ".qa/extract/img/april-2026/p26-4.jpg",
      dst: "public/images/stories/twinning-in-hyderabad.webp",
      quality: 90
    },
    // Buddhist monk in maroon robes at McLeod Ganj
    {
      src: "public/images/stories/summertimes-vintage-escapes/p20-3.webp",
      dst: "public/images/stories/buddha-purnima-info-corner-may-2026.webp",
      quality: 90
    },
    // Open safari jeep in wild scrubland
    {
      src: "public/images/stories/jawai-the-untamed-beauty/p74-4.webp",
      dst: "public/images/stories/world-tourism-day-info-corner.webp",
      quality: 90
    },
    // Night sky stargazing
    {
      src: "public/images/stories/sariska-beyond-the-wild/p66-1.webp",
      dst: "public/images/stories/world-ufo-day-facts-and-figures.webp",
      quality: 90
    },
    // Bihu dancers
    {
      src: "public/images/stories/my-town-assam/p37-6.webp",
      dst: "public/images/stories/international-dance-day-a-day-to-groove.webp",
      quality: 90
    },
    // Country canoe among water lilies
    {
      src: ".qa/extract/img/june-2026/p58-1.jpg",
      dst: "public/images/stories/world-water-day-liquid-lifeline.webp",
      quality: 90
    }
  ];

  for (const o of others) {
    if (fs.existsSync(o.src)) {
      await sharp(o.src).webp({ quality: o.quality }).toFile(o.dst + ".tmp");
      fs.renameSync(o.dst + ".tmp", o.dst);
      console.log(`Updated editorial photo: ${o.dst}`);
    } else {
      console.error(`Missing other source: ${o.src}`);
    }
  }

  console.log("All image conversions finished successfully!");
}

run().catch(console.error);
