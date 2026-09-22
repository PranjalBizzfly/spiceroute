import fs from "fs";
import path from "path";

const files = [
  "welcome-aboard-september-2026.webp",
  "welcome-aboard-august-2026.webp",
  "welcome-aboard-july-2026.webp",
  "welcome-aboard-june-2026.webp",
  "welcome-aboard-may-2026.webp",
  "welcome-aboard-march-2026.webp",
  "from-the-cmds-desk-may-2024.webp",
  "from-the-cmds-desk-april-2024.webp",
  "from-the-cmds-desk-march-2024.webp",
  "from-the-cmds-desk-february-2024.webp"
];

for (const f of files) {
  const p = path.join("public/images/stories", f);
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    console.log(`${f}: size = ${stat.size}`);
  } else {
    console.log(`${f}: MISSING`);
  }
}
