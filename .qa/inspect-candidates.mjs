import fs from "fs";
import path from "path";
import sharp from "sharp";

const candidates = [
  // june-2026
  { ed: "june-2026", file: "p04-1.jpg" },
  { ed: "june-2026", file: "p04-2.jpg" },
  { ed: "june-2026", file: "p05-1.jpg" },
  { ed: "june-2026", file: "p05-2.jpg" },
  
  // may-2026
  { ed: "may-2026", file: "p04-2.jpg" },
  { ed: "may-2026", file: "p04-4.jpg" },
  { ed: "may-2026", file: "p05-1.jpg" },

  // march-2026
  { ed: "march-2026", file: "p04-1.jpg" },
  { ed: "march-2026", file: "p05-1.jpg" },
  { ed: "march-2026", file: "p07-1.jpg" },
  { ed: "march-2026", file: "p08-1.jpg" },

  // august-2026
  { ed: "august-2026", file: "p01-2.jpg" },
  { ed: "august-2026", file: "p02-1.jpg" },
  { ed: "august-2026", file: "p03-1.jpg" },

  // july-2026
  { ed: "july-2026", file: "p01-1.jpg" },
  { ed: "july-2026", file: "p02-1.jpg" },
  { ed: "july-2026", file: "p03-2.jpg" },
  { ed: "july-2026", file: "p03-3.jpg" },
  { ed: "july-2026", file: "p05-1.jpg" },

  // april-2024
  { ed: "april-2024", file: "p02-2.jpg" },
  { ed: "april-2024", file: "p06-1.jpg" },
  { ed: "april-2024", file: "p07-1.jpg" },
  { ed: "april-2024", file: "p07-2.jpg" },
  { ed: "april-2024", file: "p07-3.jpg" },

  // march-2024
  { ed: "march-2024", file: "p02-1.jpg" },
  { ed: "march-2024", file: "p02-2.jpg" },
  { ed: "march-2024", file: "p04-1.jpg" },
  { ed: "march-2024", file: "p05-1.jpg" },
  { ed: "march-2024", file: "p05-2.jpg" },
  { ed: "march-2024", file: "p06-1.jpg" },

  // february-2024
  { ed: "february-2024", file: "p02-2.jpg" },
  { ed: "february-2024", file: "p04-1.jpg" },
  { ed: "february-2024", file: "p05-2.jpg" },
  { ed: "february-2024", file: "p06-1.jpg" },
  { ed: "february-2024", file: "p06-6.jpg" }
];

for (const c of candidates) {
  const p = path.join(".qa/extract/img", c.ed, c.file);
  if (fs.existsSync(p)) {
    const meta = await sharp(p).metadata();
    console.log(`${c.ed}/${c.file}: ${meta.width}x${meta.height}, format=${meta.format}`);
  } else {
    console.log(`${c.ed}/${c.file}: NOT FOUND`);
  }
}
