import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';

// CRC32 table for writing valid 24-bit RGB PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, crcInput, crcBuf]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Converts an 8-bit RGB or RGBA PNG into a strict 24-bit RGB PNG (colorType = 2, no alpha),
 * compositing any semi-transparent pixels onto dark #090d16 background.
 * Chrome Web Store requires screenshots and promo tiles to be 24-bit PNG (no alpha) or JPEG.
 */
export function convertPngFileToRgb24(filePath) {
  const buf = readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`Unsupported PNG format in ${filePath}: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  if (colorType === 2 && !process.argv.includes('--downsample-2x')) {
    return { width, height, alreadyRgb24: true };
  }

  const bpp = colorType === 6 ? 4 : 3;
  const rowBytes = width * bpp;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const recon = new Uint8Array(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (rowBytes + 1)];
    const srcStart = y * (rowBytes + 1) + 1;
    const dstStart = y * rowBytes;

    for (let i = 0; i < rowBytes; i++) {
      const xByte = raw[srcStart + i];
      const a = i >= bpp ? recon[dstStart + i - bpp] : 0;
      const b = y > 0 ? recon[dstStart - rowBytes + i] : 0;
      const c = y > 0 && i >= bpp ? recon[dstStart - rowBytes + i - bpp] : 0;

      let val = xByte;
      if (filterType === 1) val = (xByte + a) & 0xff;
      else if (filterType === 2) val = (xByte + b) & 0xff;
      else if (filterType === 3) val = (xByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) val = (xByte + paethPredictor(a, b, c)) & 0xff;

      recon[dstStart + i] = val;
    }
  }

  const downsample2x = process.argv.includes('--downsample-2x');
  const outWidth = downsample2x ? Math.floor(width / 2) : width;
  const outHeight = downsample2x ? Math.floor(height / 2) : height;

  // Encode strict 24-bit RGB (colorType = 2)
  const outStride = outWidth * 3 + 1;
  const outRaw = Buffer.alloc(outHeight * outStride);
  const bgR = 9;
  const bgG = 13;
  const bgB = 22;

  function readRgbAt(px, py) {
    const sIdx = py * rowBytes + px * bpp;
    const r = recon[sIdx];
    const g = recon[sIdx + 1];
    const b = recon[sIdx + 2];
    const a = bpp === 4 ? recon[sIdx + 3] / 255 : 1;
    return [
      r * a + bgR * (1 - a),
      g * a + bgG * (1 - a),
      b * a + bgB * (1 - a),
    ];
  }

  for (let y = 0; y < outHeight; y++) {
    outRaw[y * outStride] = 0; // Filter 0
    for (let x = 0; x < outWidth; x++) {
      const dIdx = y * outStride + 1 + x * 3;
      if (downsample2x) {
        const p00 = readRgbAt(x * 2, y * 2);
        const p10 = readRgbAt(x * 2 + 1, y * 2);
        const p01 = readRgbAt(x * 2, y * 2 + 1);
        const p11 = readRgbAt(x * 2 + 1, y * 2 + 1);
        outRaw[dIdx] = Math.round((p00[0] + p10[0] + p01[0] + p11[0]) / 4);
        outRaw[dIdx + 1] = Math.round((p00[1] + p10[1] + p01[1] + p11[1]) / 4);
        outRaw[dIdx + 2] = Math.round((p00[2] + p10[2] + p01[2] + p11[2]) / 4);
      } else {
        const [r, g, b] = readRgbAt(x, y);
        outRaw[dIdx] = Math.round(r);
        outRaw[dIdx + 1] = Math.round(g);
        outRaw[dIdx + 2] = Math.round(b);
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(outWidth, 0);
  ihdr.writeUInt32BE(outHeight, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // 24-bit Truecolor RGB (no alpha!)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const outPng = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(outRaw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(filePath, outPng);
  return { width: outWidth, height: outHeight, alreadyRgb24: false };
}

if (process.argv[1] && process.argv[1].endsWith('convert-png-rgb24.mjs')) {
  for (const targetPath of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
    const info = convertPngFileToRgb24(targetPath);
    console.log(`Converted ${targetPath} -> ${info.width}x${info.height} 24-bit RGB PNG`);
  }
}
