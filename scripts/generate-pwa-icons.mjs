// Generates public/icon-192.png, public/icon-512.png, and public/favicon.ico
// from public/pwa_manifest.png (the PWA manifest icon source, not necessarily
// square). Run with: node scripts/generate-pwa-icons.mjs
//
// Re-run this whenever public/pwa_manifest.png changes.

import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const source = path.join(publicDir, "pwa_manifest.png");

async function squareBuffer(size) {
  return sharp(source)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

async function main() {
  const icon192 = await squareBuffer(192);
  const icon512 = await squareBuffer(512);
  const favicon32 = await squareBuffer(32);
  const favicon16 = await squareBuffer(16);

  await writeFile(path.join(publicDir, "icon-192.png"), icon192);
  await writeFile(path.join(publicDir, "icon-512.png"), icon512);

  const icoBuffer = await pngToIco([favicon16, favicon32]);
  await writeFile(path.join(publicDir, "favicon.ico"), icoBuffer);

  console.log("Generated icon-192.png, icon-512.png, favicon.ico in public/");
}

main().catch((error) => {
  console.error("Icon generation failed:", error);
  process.exitCode = 1;
});
