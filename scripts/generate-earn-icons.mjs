import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicDir = new URL('../public/', import.meta.url);
for (const size of [192, 512]) {
  const label = Buffer.from(`<svg width="${size}" height="${size}"><rect y="${size * .71}" width="${size}" height="${size * .29}" fill="#8338ec"/><text x="50%" y="${size * .92}" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="${size * .19}">EARN</text></svg>`);
  await sharp(fileURLToPath(new URL(`icon-${size}.png`, publicDir))).resize(size, size).composite([{ input: label }]).png().toFile(fileURLToPath(new URL(`earn-icon-${size}.png`, publicDir)));
}
const icon = fileURLToPath(new URL('earn-icon-192.png', publicDir));
await writeFile(new URL('favicon.ico', publicDir), await pngToIco([
  await sharp(icon).resize(16, 16).png().toBuffer(),
  await sharp(icon).resize(32, 32).png().toBuffer(),
]));
