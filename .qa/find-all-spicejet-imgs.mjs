import fs from "fs";
import path from "path";
import sharp from "sharp";

// Search all editions for any images containing "spicejet", "aircraft", "plane", or inspect images in airline articles
const editions = fs.readdirSync(".qa/extract/img");

async function checkEdition(ed) {
  const dir = path.join(".qa/extract/img", ed);
  if (!fs.statSync(dir).isDirectory()) return;
  const files = fs.readdirSync(dir);
  
  // Also check pages.json
  const pagesFile = `.qa/extract/${ed}.pages.json`;
  if (!fs.existsSync(pagesFile)) return;
  const pages = JSON.parse(fs.readFileSync(pagesFile, "utf8"));
  
  for (let i = 0; i < pages.length; i++) {
    const text = pages[i].text || "";
    const pageNum = pages[i].pageNumber || i + 1;
    // Look for airline features, fleet, spicejet life, welcome
    if (text.match(/SpiceJet|Boeing|Airbus|SpiceMax|SpiceRoute|Welcome Aboard|CMD/i)) {
      const pStr = pageNum < 10 ? `0${pageNum}` : `${pageNum}`;
      const imgs = files.filter(f => f.startsWith(`p${pStr}-`));
      if (imgs.length > 0) {
        console.log(`[${ed}] Page ${pageNum}: ${imgs.length} images (${imgs.slice(0, 3).join(", ")}) - text: ${text.slice(0, 60).replace(/\s+/g, " ")}`);
      }
    }
  }
}

for (const ed of editions) {
  await checkEdition(ed);
}
