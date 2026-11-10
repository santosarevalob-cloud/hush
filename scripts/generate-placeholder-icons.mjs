// One-off utility: generates solid-color placeholder PWA icons so the
// manifest has valid files to point at. Replace public/icons/*.png with
// real artwork whenever you have some, then this script is no longer needed.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT_DIR = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const BG = [30, 41, 59]; // slate-800
const FG = [232, 121, 249]; // fuchsia-400 accent stripe

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stripeHeight = Math.round(size * 0.18);
  const raw = Buffer.alloc((1 + size * 3) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter: none
    const inStripe = y >= size - stripeHeight;
    const [r, g, b] = inStripe ? FG : BG;
    for (let x = 0; x < size; x++) {
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }

  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [180, 192, 512]) {
  const buf = makePng(size);
  const path = new URL(`icon-${size}.png`, OUT_DIR);
  writeFileSync(path, buf);
  console.log('wrote', path.pathname, buf.length, 'bytes');
}
