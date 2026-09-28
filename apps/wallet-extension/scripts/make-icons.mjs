/**
 * Generates the extension icons as real PNGs using only Node's zlib.
 * No image dependency, no binary assets checked in by hand.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'icons');

const TERRACOTTA = [193, 95, 60]; // #C15F3C — brand primary
const CREAM = [250, 249, 245]; // #FAF9F5 — warm white

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedSquare(x, y, size, radius) {
  const min = radius;
  const max = size - radius;
  const cx = x < min ? min : x > max ? max : x;
  const cy = y < min ? min : y > max ? max : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** Pointy-top regular hexagon: |x| <= R, |y| <= R*√3/2, √3|x| + |y| <= R√3 */
function insideHexagon(dx, dy, radius) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return ax <= radius && ay <= (radius * Math.sqrt(3)) / 2 && Math.sqrt(3) * ax + ay <= radius * Math.sqrt(3);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const corner = size * 0.22;
  const outer = size * 0.34;
  const stroke = Math.max(1, size * 0.062);
  const center = (size - 1) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      if (!insideRoundedSquare(x, y, size, corner)) continue;

      const dx = x - center;
      const dy = y - center;
      const inHex = insideHexagon(dx, dy, outer);
      const inInner = insideHexagon(dx, dy, outer - stroke);
      const colour = inHex && !inInner ? CREAM : TERRACOTTA;

      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, encodePng(size, drawIcon(size)));
  console.log(`wrote ${file}`);
}
