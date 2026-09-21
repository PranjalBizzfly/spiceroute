// The monthly Predictions page, assembled from its printed geometry: each
// zodiac sign's heading, forecast, "Lucky Number: n" and "Lucky Colour: c",
// taken in block order after the heading. The build output lists every
// sign for review, and unreferenced.mjs confirms nothing printed is left out.
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks } from "../blocks.mjs";

const SIGNS = ["ARIES", "TAURUS", "GEMINI", "CANCER", "LEO", "VIRGO", "LIBRA", "SCORPIO", "SAGITTARIUS", "CAPRICORN", "AQUARIUS", "PISCES"];

export async function predictionsSpec({ slug, edition, page, label, category = "predictions", ...rest }) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
  const blocks = (await pageBlocks(doc, page)).map((b) => ({ ...b, t: b.text.replace(/\s+/g, " ").trim() }));
  const at = (pred, from = 0) => {
    for (let i = from; i < blocks.length; i++) if (pred(blocks[i])) return i;
    throw new Error(`${slug}: predictions block not found after ${from}`);
  };
  const find = (t) => blocks[at((b) => b.t === t)].id;
  const nonEmpty = (b) => b.t.length > 0 && b.size >= 1;

  const body = [];
  // contact line printed under the astrologer's name
  const email = at((b) => b.t === "email");
  body.push({ note: [blocks[email].id, blocks[at(nonEmpty, email + 1)].id, find("web:"), blocks[at((b) => /^www\./.test(b.t))].id] });

  for (const sign of SIGNS) {
    const h = at((b) => b.t === sign);
    const text = at((b) => b.t.length > 100, h + 1);
    // the number is sometimes set in the same block as both labels
    // ("Lucky No.: 8" / "Lucky Colour:" as its two lines)
    const merged = blocks[text + 1] && /^Lucky No(\.|umber):\s*\S+\s+Lucky Colour:$/.test(blocks[text + 1].t) ? text + 1 : -1;
    if (merged >= 0) {
      const col = at(nonEmpty, merged + 1);
      body.push(
        { h: blocks[h].id },
        { flow: [blocks[text].id] },
        { note: [`${blocks[merged].id}@0-0`] },
        { note: [`${blocks[merged].id}@1-1`, blocks[col].id] }
      );
      continue;
    }
    const numLabel = at((b) => b.t === "Lucky Number:" || b.t === "Lucky No.:", text + 1);
    const num = at(nonEmpty, numLabel + 1);
    const colLabel = at((b) => b.t === "Lucky Colour:", num + 1);
    const col = at(nonEmpty, colLabel + 1);
    body.push(
      { h: blocks[h].id },
      { flow: [blocks[text].id] },
      { note: [blocks[numLabel].id, blocks[num].id] },
      { note: [blocks[colLabel].id, blocks[col].id] }
    );
  }
  doc.destroy();
  return {
    slug,
    edition,
    category,
    pdfPages: [page],
    imagePdfPage: page,
    title: "Predictions",
    label,
    section: "Predictions",
    author: "Dr. Prem Kumar Sharma",
    role: "Astrologer, Palmist, Numerologist, Vaastu Consultant & 3-Time Limca Book of Records Holder",
    noStandfirst: true,
    collapsible: true,
    body,
    uses: [find("Dr. Prem Kumar Sharma"), blocks[at((b) => /^\(Astrologer/.test(b.t))].id, find("PREDICTIONS"), find(label)],
    ...rest,
  };
}
