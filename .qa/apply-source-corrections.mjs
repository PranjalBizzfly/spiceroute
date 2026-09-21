// Applies the source-verified corrections to src/data/stories.ts:
//  - bylines/roles exactly as printed in the edition PDFs (invented ones removed)
//  - article images extracted from the edition PDFs, with alt text + source
//  - drops readTime (never verified; the article page now computes it)
// Every value below was checked against extract/*.pages.json and the renders.
import fs from "node:fs/promises";

const FILE = "../src/data/stories.ts";
const manifest = JSON.parse(await fs.readFile("extract/story-image-manifest.json", "utf8"));
const EDITION_TITLE = {
  "september-2026": "Spice Route - Sept 2026",
  "august-2026": "Spice Route - August 2026",
  "july-2026": "Spice Route - July 2026",
};

// null = remove the field (no printed byline / no printed role)
const FIX = {
  "kolkata-forever-day-in-a-city": { author: "Florina Soren", role: "Editor", alt: "Victoria Memorial in Kolkata, reflected in the water in front of it" },
  "ranveer-brar-conversation": { author: "Pallavi Singh", role: null, alt: "Chef Ranveer Brar holding a plated dessert" },
  "five-monsoon-escapes-rain-kissed-splendour": { author: "Mini Ribeiro", role: null, alt: "Terraced tea estates on green hills under monsoon clouds" },
  "kitchen-healing-traditional-superfoods": { author: "Ryan Fernando", role: "Nutritionist", alt: "Turmeric powder, turmeric root, fresh ginger and citrus on a dark surface" },
  "global-flavours-take-off": { author: "Nishant Choubey", role: "Chef", alt: "A plated contemporary dish with fresh herbs and a green sauce" },
  "sweet-devotion-modak-traditions": { author: "Ayushi Anand", role: null, alt: "Steamed modaks on a brass plate before a Ganesha idol, with red flowers" },
  "ladakh-roof-of-the-world": { author: null, role: null, alt: "A monastery on a rocky hilltop below snow-capped mountains in Ladakh" },
  "saving-the-greater-one-horned-rhino": { author: null, role: null, alt: "Illustration: a rhino silhouette beneath an acacia tree against a setting sun" },
  "my-hometown-gwalior": { author: "Pooja Bhadauria", role: "Senior Cabin Crew", alt: "The sandstone ramparts of Gwalior Fort" },
  "icons-of-new-india": { author: "Arjun Kumar", role: null, alt: "The entrance to the Atal Tunnel at Rohtang, beneath misty mountains" },
  "from-estate-to-espresso": { author: "Bindu Gopal Rao", role: null, alt: "A cup of black coffee on a saucer, surrounded by roasted coffee beans" },
  "sittong-orange-valley-hills": { author: "Konkana Ray", role: null, alt: "Snow-capped Himalayan peaks rising above clouds and green hills" },
  "my-hometown-wayanad": { author: "Asiya Farshana", role: "Cabin Crew", alt: "Misty green hills and trees under a cloudy sky" },
  "varanasi-the-eternal-city": { author: "Shibani Bawa", role: null, alt: "Varanasi's riverside ghats at sunrise, with boats moored on the Ganga" },
  "day-in-a-city-pune": { author: "Ayushi Anand", role: null, alt: "Green hills and a winding road above a lake" },
  "live-long-travel-longer": { author: "Manjulika Pramod", role: null, alt: "A traveller leaning out of a car window with arms outstretched on a country road" },
  "japanese-desserts-india": { author: "Bindu Gopal Rao", role: null, alt: "Two white mochi on a small plate beside a teapot" },
  "fur-all-pet-yoga": { author: "Deepa Natarajan Lobo", role: null, alt: "A woman holding a yoga headstand beside a seated dog" },
  "my-hometown-jaipur": { author: "Deepesh Sharma", role: "Cabin Crew", alt: "The courtyard and palace walls of Amer Fort in Jaipur" },
};

const q = (s) => JSON.stringify(s);
let src = await fs.readFile(FILE, "utf8");
const parts = src.split(/(?=\n  \{\n    slug: ")/);
let changed = 0;

const out = parts.map((block) => {
  const slug = (block.match(/\n  \{\n    slug: "([^"]+)"/) || [])[1];
  if (!slug) return block;
  const fix = FIX[slug];
  const img = manifest[slug];
  if (!fix || !img) throw new Error(`No correction/image for ${slug}`);
  let b = block;

  b = b.replace(/\n    readTime: "[^"]*",/, "");

  // author
  if (fix.author === null) b = b.replace(/\n    author: "[^"]*",/, "");
  else if (/\n    author: /.test(b)) b = b.replace(/\n    author: "[^"]*",/, `\n    author: ${q(fix.author)},`);
  else b = b.replace(/(\n    category: "[^"]*",)/, `$1\n    author: ${q(fix.author)},`);

  // role
  if (fix.role === null) b = b.replace(/\n    role: "[^"]*",/, "");
  else if (/\n    role: /.test(b)) b = b.replace(/\n    role: "[^"]*",/, `\n    role: ${q(fix.role)},`);
  else b = b.replace(/(\n    author: "[^"]*",)/, `$1\n    role: ${q(fix.role)},`);

  // image + alt + source
  const source = `${EDITION_TITLE[img.edition]}, PDF page ${img.pdfPage}`;
  b = b.replace(
    /\n    heroImage: "[^"]*",/,
    `\n    heroImage: ${q(img.file)},\n    heroImageAlt: ${q(fix.alt)},\n    heroImageSource: ${q(source)},`
  );
  changed++;
  return b;
});

await fs.writeFile(FILE, out.join(""));
console.log(`updated ${changed} stories`);
