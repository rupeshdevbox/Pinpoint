import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '../public/icons');
mkdirSync(iconsDir, { recursive: true });

// CRC32 lookup table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
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

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // Filter type 0 (None)
    for (let x = 0; x < width * 4; x++) {
      raw[y * stride + 1 + x] = rgba[y * width * 4 + x];
    }
  }

  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp(v, min = 0, max = 1) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : clamp((wx * vx + wy * vy) / len2, 0, 1);
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

/**
 * Evaluates normalized [0..1]x[0..1] Pinpoint brand icon:
 * - Rounded indigo-to-violet-to-cyan squircle container
 * - Crisp white bookmark ribbon on left-center
 * - Overlapping golden-cyan search loupe on bottom-right
 */
function sampleIconColor(u, v) {
  // 1. Squircle signed distance
  const cx = u - 0.5;
  const cy = v - 0.5;
  const half = 0.435;
  const radius = 0.115;
  const qx = Math.abs(cx) - (half - radius);
  const qy = Math.abs(cy) - (half - radius);
  const outDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;

  if (outDist > 0.002) {
    return [0, 0, 0, 0];
  }

  // Diagonal rich gradient (#312e81 -> #6366f1 -> #06b6d4)
  const diag = clamp((u * 0.65 + v * 0.75 - 0.06) / 1.25);
  let r, g, b;
  if (diag < 0.55) {
    const t = diag / 0.55;
    r = lerp(49, 99, t);
    g = lerp(46, 102, t);
    b = lerp(129, 241, t);
  } else {
    const t = (diag - 0.55) / 0.45;
    r = lerp(99, 14, t);
    g = lerp(102, 165, t);
    b = lerp(241, 233, t);
  }

  // Subtle top-left glow
  const glow = Math.max(0, 1 - Math.hypot(u - 0.24, v - 0.2) * 1.65);
  r = clamp(r + glow * 34, 0, 255);
  g = clamp(g + glow * 36, 0, 255);
  b = clamp(b + glow * 45, 0, 255);

  // Subtle inner rim highlight
  if (outDist > -0.016) {
    r = lerp(r, 255, 0.18);
    g = lerp(g, 255, 0.18);
    b = lerp(b, 255, 0.22);
  }

  // 2. Bookmark ribbon shape (x in [0.25, 0.61], y in [0.20, 0.74] with V-notch at bottom)
  const bmLeft = 0.255;
  const bmRight = 0.605;
  const bmTop = 0.205;
  const bmBottom = 0.735;
  const bmMidX = (bmLeft + bmRight) / 2;
  const notchHeight = 0.115;
  const cornerR = 0.045;

  let inBookmark = false;
  if (u >= bmLeft && u <= bmRight && v >= bmTop && v <= bmBottom) {
    // Top rounded corners check
    let topOk = true;
    if (v < bmTop + cornerR) {
      if (u < bmLeft + cornerR) {
        topOk = Math.hypot(u - (bmLeft + cornerR), v - (bmTop + cornerR)) <= cornerR;
      } else if (u > bmRight - cornerR) {
        topOk = Math.hypot(u - (bmRight - cornerR), v - (bmTop + cornerR)) <= cornerR;
      }
    }
    // Bottom V-notch check
    const normDx = Math.abs(u - bmMidX) / ((bmRight - bmLeft) / 2);
    const bottomEdgeY = (bmBottom - notchHeight) + normDx * notchHeight;
    if (topOk && v <= bottomEdgeY) {
      inBookmark = true;
    }
  }

  // Cutout around search loupe so the magnifying glass pops cleanly over the bookmark
  const loupeCx = 0.615;
  const loupeCy = 0.575;
  const loupeOuterR = 0.148;
  const loupeInnerR = 0.088;
  const dLoupe = Math.hypot(u - loupeCx, v - loupeCy);
  const dHandle = distToSegment(u, v, loupeCx + 0.095, loupeCy + 0.095, 0.79, 0.75);

  const inLoupeHalo = dLoupe <= loupeOuterR + 0.028 || dHandle <= 0.058;

  if (inBookmark && !inLoupeHalo) {
    r = 250;
    g = 252;
    b = 255;
  }

  // 3. Crisp Search Loupe (ring + handle + center pinpoint dot)
  const inRing = dLoupe <= loupeOuterR && dLoupe >= loupeInnerR;
  const inHandle = dHandle <= 0.033 && dLoupe >= loupeInnerR;
  const inCenterDot = dLoupe <= 0.032;

  if (inRing || inHandle) {
    // Warm luminous gold/white accent for maximum toolbar contrast
    r = 254;
    g = 243;
    b = 199;
  } else if (inCenterDot) {
    r = 56;
    g = 189;
    b = 248;
  }

  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

function renderIconPng(size) {
  const ss = 4; // 4x4 = 16x supersampling for silky anti-aliased edges
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          const [r, g, b, a] = sampleIconColor(u, v);
          const alphaNorm = a / 255;
          sumR += r * alphaNorm;
          sumG += g * alphaNorm;
          sumB += b * alphaNorm;
          sumA += a;
        }
      }
      const samples = ss * ss;
      const outA = sumA / samples;
      const idx = (y * size + x) * 4;
      if (outA > 0) {
        const alphaNormSum = sumA / 255;
        rgba[idx] = Math.round(clamp(sumR / alphaNormSum, 0, 255));
        rgba[idx + 1] = Math.round(clamp(sumG / alphaNormSum, 0, 255));
        rgba[idx + 2] = Math.round(clamp(sumB / alphaNormSum, 0, 255));
        rgba[idx + 3] = Math.round(outA);
      }
    }
  }
  return encodePng(size, size, rgba);
}

for (const size of [16, 32, 48, 128]) {
  const png = renderIconPng(size);
  writeFileSync(resolve(iconsDir, `icon-${size}.png`), png);
}

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <linearGradient id="bg" x1="12" y1="8" x2="116" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#312E81"/>
      <stop offset="55%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="26" fill="url(#bg)"/>
  <path d="M33 31C33 27.6863 35.6863 25 39 25H71C74.3137 25 77 27.6863 77 31V93L55 78.5L33 93V31Z" fill="#FAFCFF"/>
  <circle cx="79" cy="74" r="22" fill="#4338CA" opacity="0.35"/>
  <circle cx="79" cy="74" r="15" stroke="#FEF3C7" stroke-width="7.5"/>
  <circle cx="79" cy="74" r="4" fill="#38BDF8"/>
  <path d="M90.5 85.5L102 97" stroke="#FEF3C7" stroke-width="8" stroke-linecap="round"/>
</svg>
`;

writeFileSync(resolve(iconsDir, 'icon.svg'), svgIcon, 'utf8');
console.log('Generated icons: icon-16.png, icon-32.png, icon-48.png, icon-128.png, icon.svg');
