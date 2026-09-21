import fs from "node:fs";
import path from "node:path";

export interface ImageSize {
  width: number;
  height: number;
}

const cache = new Map<string, ImageSize | undefined>();

/**
 * Pixel size of an image in /public, read from its file header at build time
 * (pages using it are statically generated). Lets article pages show each
 * verified photograph at its own proportions instead of a fixed crop.
 * Returns undefined for remote or unreadable files.
 */
export function localImageSize(src: string): ImageSize | undefined {
  if (!src.startsWith("/")) return undefined;
  if (cache.has(src)) return cache.get(src);

  let size: ImageSize | undefined;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", src));
    if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      // WebP: size lives in the first chunk, which differs per encoding
      const chunk = buf.toString("ascii", 12, 16);
      if (chunk === "VP8X") {
        // extended: 24-bit canvas width-1 / height-1
        size = { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      } else if (chunk === "VP8L") {
        // lossless: 14-bit width-1 / height-1 packed after the 0x2f signature
        const bits = buf.readUInt32LE(21);
        size = { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
      } else if (chunk === "VP8 ") {
        // lossy: 14-bit width / height after the key-frame start code
        size = { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
    } else if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
      // PNG: IHDR width/height
      size = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    } else if (buf[0] === 0xff && buf[1] === 0xd8) {
      // JPEG: walk the markers to the first start-of-frame
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isSof) {
          size = { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
          break;
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    size = undefined;
  }

  cache.set(src, size);
  return size;
}
