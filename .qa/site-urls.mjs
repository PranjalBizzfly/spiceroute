// The site's own public URL rules (src/lib/urls.ts), for QA scripts that
// build story and category addresses from the data. Transpiled on the fly,
// so the scripts can never drift from the site.
//   import { storyHref, categoryHref } from "./site-urls.mjs";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ts = require(path.join(here, "../node_modules/typescript"));
const out = path.join(here, "tmp/site-urls");
fs.mkdirSync(path.join(out, "lib"), { recursive: true });
fs.mkdirSync(path.join(out, "data"), { recursive: true });
const compile = (from, to) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(here, "..", from), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from "\.\.\/data\/categories"/, 'from "../data/categories.mjs"');
  fs.writeFileSync(path.join(out, to), js);
};
compile("src/data/categories.ts", "data/categories.mjs");
compile("src/lib/urls.ts", "lib/urls.mjs");
const urls = await import(pathToFileURL(path.join(out, "lib/urls.mjs")).href + `?t=${Date.now()}`);

export const { storyHref, categoryHref, categorySlug, storyUrlSlug, legacyRedirects } = urls;
