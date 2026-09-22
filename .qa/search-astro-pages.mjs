import fs from "fs";
import path from "path";

const files = fs.readdirSync(".qa/extract").filter(f => f.endsWith(".pages.json"));

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(".qa/extract", f), "utf8"));
  data.forEach((pg, idx) => {
    const text = (pg.text || "").toLowerCase();
    if (text.match(/jantar mantar|astronomy|astrological|observatory|zodiac|rashivalaya|sundial|stargazing|night sky|planetarium/i)) {
      console.log(`[${f}] pg ${pg.pageNumber || idx+1}: ${text.slice(0, 100).replace(/\s+/g, " ")}`);
    }
  });
}
