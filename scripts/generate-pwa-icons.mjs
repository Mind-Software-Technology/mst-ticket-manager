// Generate PWA icons into public/. Run: node scripts/generate-pwa-icons.mjs
import sharp from "sharp";

const svg = (size, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb"/>
  <text x="256" y="256" font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${280 - pad}" fill="#fff" text-anchor="middle" dominant-baseline="central">M</text>
</svg>`;

const targets = [
  ["public/icon-192.png", 192, 0],
  ["public/icon-512.png", 512, 0],
  ["public/icon-maskable-512.png", 512, 60], // smaller glyph = safe zone for maskable
  ["public/apple-touch-icon.png", 180, 0],
];

for (const [file, size, pad] of targets) {
  await sharp(Buffer.from(svg(size, pad))).png().toFile(file);
  console.log("wrote", file);
}
