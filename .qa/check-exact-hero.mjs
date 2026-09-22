import fs from "fs";

const content = fs.readFileSync("src/data/stories.ts", "utf8");

const slugs = [
  "welcome-aboard-september-2026",
  "welcome-aboard-august-2026",
  "welcome-aboard-july-2026",
  "welcome-aboard-june-2026",
  "welcome-aboard-may-2026",
  "welcome-aboard-march-2026",
  "from-the-cmds-desk-may-2024",
  "from-the-cmds-desk-april-2024",
  "from-the-cmds-desk-march-2024",
  "from-the-cmds-desk-february-2024"
];

for (const slug of slugs) {
  const reg = new RegExp(`slug:\\s*["']${slug}["'][\\s\\S]*?heroImage:\\s*["']([^"']+)["']`);
  const m = content.match(reg);
  console.log(`${slug} -> ${m ? m[1] : "NOT FOUND"}`);
}
