// Turns PDF pages into paragraph "blocks" straight from the text layer,
// in content-stream (reading) order, with the real font name and size.
// Nothing is retyped: article text is later assembled from these blocks.
//
// Usage: node blocks.mjs <edition> <page> [<page> ...]   -> extract/blocks/<edition>-p<n>.json + console dump
import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export async function pageBlocks(doc, n) {
  const page = await doc.getPage(n);
  await page.getOperatorList(); // loads font objects so real font names are known
  const tc = await page.getTextContent();
  const fontName = (id) => {
    try {
      const f = page.commonObjs.get(id);
      return (f?.name || id).replace(/^[A-Z]{6}\+/, "");
    } catch {
      return id;
    }
  };

  const blocks = [];
  let cur = null;
  let prev = null; // previous non-empty item
  const flush = () => {
    if (cur && cur.lines.length) {
      cur.text = joinLines(cur.lines, cur.hyphens);
      // raw lines retained for flow assembly: [{y, items:[{str,x,w,size,font}]}]
      cur.rawLines = cur.lines.map((items) => ({ y: items[0].y, x: items[0].x, items }));
      delete cur.lines;
      blocks.push(cur);
    }
    cur = null;
  };

  for (const it of tc.items) {
    const [, , , , x, y] = it.transform;
    const size = Math.round(it.height * 10) / 10;
    const font = fontName(it.fontName);
    if (!it.str) {
      // zero-width marker items open a new paragraph/frame in these PDFs
      if (it.hasEOL && it.width === 0) {
        flush();
        prev = null;
      }
      continue;
    }
    const sameStyle = cur && cur.font === font && Math.abs(cur.size - size) < 0.6;
    const jumped = prev && (y > prev.y + size * 2 || Math.abs(y - prev.y) > size * 3.2);
    if (!cur || !sameStyle || jumped) {
      flush();
      cur = { font, size, x: Math.round(x), y: Math.round(y), lines: [[]], hyphens: [] };
    } else if (prev && Math.abs(y - prev.y) > size * 0.4) {
      cur.lines.push([]); // new line in the same block
    }
    const line = cur.lines[cur.lines.length - 1];
    line.push({ str: it.str, x, y, w: it.width, size, font });
    prev = { x, y, w: it.width };
  }
  flush();
  page.cleanup();
  return blocks.map((b, i) => ({ id: `p${n}b${i}`, ...b }));
}


// Join items within a line using real gaps; join lines with spaces, and flag
// every end-of-line hyphen so it can be decided (join vs keep) explicitly.
function joinLines(lines, hyphens) {
  const texts = lines.map((items) => {
    let s = "";
    let end = null;
    for (const it of items) {
      if (end !== null) {
        const gap = it.x - end;
        const needSpace = gap > it.size * 0.15 && !s.endsWith(" ") && !it.str.startsWith(" ");
        if (needSpace) s += " ";
      }
      s += it.str;
      end = it.x + it.w;
    }
    return s.replace(/\s+/g, " ").trim();
  });
  let out = "";
  texts.forEach((t, i) => {
    if (i === 0) {
      out = t;
      return;
    }
    const m = out.match(/([A-Za-z’']+)-$/);
    if (m && /^[a-z]/.test(t)) {
      const next = t.match(/^[A-Za-z’']+/)[0];
      hyphens.push(`${m[1]}-|${next}`);
      out = out + "¬" + t; // ¬ marks an end-of-line hyphen awaiting a decision
    } else if (/[—–-]$/.test(out) && !/\s[—–-]$/.test(out)) {
      out = out + t; // dash/hyphen before a capital or number: keep, no space
    } else {
      out = out + " " + t;
    }
  });
  return out;
}

if (process.argv[1]?.endsWith("blocks.mjs") && process.argv[2] === "--lines") {
  // node blocks.mjs --lines <edition> <blockId>  -> numbered lines of one block
  const [, , , edition, id] = process.argv;
  const n = Number(id.match(/^p(\d+)b/)[1]);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)), verbosity: 0 }).promise;
  const b = (await pageBlocks(doc, n)).find((x) => x.id === id);
  b.rawLines.forEach((l, i) => console.log(`${String(i).padStart(3)} y=${Math.round(l.y)} x=${Math.round(l.x)}: ${l.items.map((it) => it.str).join("")}`));
} else if (process.argv[1]?.endsWith("blocks.mjs")) {
  const [edition, ...pages] = process.argv.slice(2);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await fs.readFile(`pdf/${edition}.pdf`)),
    verbosity: 0,
  }).promise;
  await fs.mkdir("extract/blocks", { recursive: true });
  for (const p of pages.map(Number)) {
    const blocks = await pageBlocks(doc, p);
    await fs.writeFile(`extract/blocks/${edition}-p${p}.json`, JSON.stringify(blocks, null, 1));
    console.log(`\n================ ${edition} PDF p${p} (${blocks.length} blocks) ================`);
    for (const b of blocks) {
      console.log(`[${b.id}] ${b.font} ${b.size}pt @${b.x},${b.y}: ${b.text}`);
    }
  }
}
