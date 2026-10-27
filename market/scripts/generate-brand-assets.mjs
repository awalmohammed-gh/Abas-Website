import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, "apps", "web");
const BRAND_DIR = path.join(APP_DIR, "public", "images", "brand");
const ICONS_DIR = path.join(APP_DIR, "public", "icons");
const PUBLIC_DIR = path.join(APP_DIR, "public");
const SRC_APP_DIR = path.join(APP_DIR, "src", "app");

const IMG_ADMIN_SOURCE = "C:/Users/USER/.gemini/antigravity-ide/brain/b8a546d6-c86b-43ba-a348-48adb86c82fb/.user_uploaded/media_1793087922617.png";
const IMG_STORE_SOURCE = "C:/Users/USER/.gemini/antigravity-ide/brain/b8a546d6-c86b-43ba-a348-48adb86c82fb/.user_uploaded/media_1793088055143.png";

// Helper: build standard multi-resolution ICO file
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size of PNG data
    entry.writeUInt32LE(offset, 12); // offset in file
    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function makeTransparent({ sourceFile, isAdmin, handleSeed }) {
  const { data, info } = await sharp(sourceFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const isProtected = new Uint8Array(width * height);
  if (isAdmin) {
    // Protect Admin Panel pill (blue rounded pill with white text)
    const cx = 685.5;
    const cy = 340.5;
    const rBadge = 88;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (y >= 565 && y <= 630 && x >= 320 && x <= 680) {
          isProtected[idx] = 1;
        }
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rBadge * rBadge) {
          isProtected[idx] = 1;
        }
      }
    }
  }

  function isNearWhite(x, y) {
    const idx = (y * width + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const dr = 254 - r;
    const dg = 254 - g;
    const db = 254 - b;
    return Math.sqrt(dr * dr + dg * dg + db * db) < 32;
  }

  const toTransparent = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed all borders
  for (let x = 0; x < width; x++) {
    if (!isProtected[0 * width + x] && isNearWhite(x, 0)) {
      queue.push(x, 0);
      visited[0 * width + x] = 1;
    }
    if (!isProtected[(height - 1) * width + x] && isNearWhite(x, height - 1)) {
      queue.push(x, height - 1);
      visited[(height - 1) * width + x] = 1;
    }
  }
  for (let y = 0; y < height; y++) {
    if (!isProtected[y * width + 0] && isNearWhite(0, y) && !visited[y * width + 0]) {
      queue.push(0, y);
      visited[y * width + 0] = 1;
    }
    if (!isProtected[y * width + (width - 1)] && isNearWhite(width - 1, y) && !visited[y * width + (width - 1)]) {
      queue.push(width - 1, y);
      visited[y * width + (width - 1)] = 1;
    }
  }

  // Seed handle loop
  if (handleSeed && !visited[handleSeed.y * width + handleSeed.x]) {
    queue.push(handleSeed.x, handleSeed.y);
    visited[handleSeed.y * width + handleSeed.x] = 1;
  }

  let head = 0;
  while (head < queue.length) {
    const px = queue[head++];
    const py = queue[head++];
    toTransparent[py * width + px] = 1;

    const neighbors = [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (!visited[nidx] && !isProtected[nidx] && isNearWhite(nx, ny)) {
          visited[nidx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  // Apply alpha and edge antialiasing
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const nidx = y * width + x;
      if (toTransparent[nidx]) {
        data[idx + 3] = 0;
      } else if (!isProtected[nidx]) {
        let adjTrans = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && toTransparent[ny * width + nx]) {
              adjTrans = true;
              break;
            }
          }
          if (adjTrans) break;
        }
        if (adjTrans) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const dr = 254 - r;
          const dg = 254 - g;
          const db = 254 - b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist < 45) {
            data[idx + 3] = Math.max(0, Math.min(255, Math.round((dist / 45) * 255)));
          }
        }
      }
    }
  }

  return sharp(data, { raw: { width, height, channels: 4 } });
}

async function findBoundingBox(sharpInstance, threshold = 20) {
  const { data, info } = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    left: Math.max(0, minX - 16),
    top: Math.max(0, minY - 16),
    width: Math.min(width - Math.max(0, minX - 16), maxX - minX + 32),
    height: Math.min(height - Math.max(0, minY - 16), maxY - minY + 32),
  };
}

async function main() {
  console.log("Generating brand assets...");
  fs.mkdirSync(BRAND_DIR, { recursive: true });
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  // 1. Process Storefront Image (Image 2)
  console.log("Processing Storefront assets (Image 2)...");
  const storeTransInstance = await makeTransparent({
    sourceFile: IMG_STORE_SOURCE,
    isAdmin: false,
    handleSeed: { x: 570, y: 150 },
  });
  const storeBBox = await findBoundingBox(storeTransInstance);
  console.log("Storefront BBox:", storeBBox);

  // Storefront transparent logo
  const storeTransCropped = storeTransInstance.clone().extract(storeBBox);
  await storeTransCropped.png().toFile(path.join(BRAND_DIR, "aba-mart-logo-transparent.png"));

  // Storefront solid white logo
  await sharp(IMG_STORE_SOURCE)
    .extract(storeBBox)
    .png()
    .toFile(path.join(BRAND_DIR, "aba-mart-logo.png"));

  // Storefront emblem (for favicon and compact marks):
  // The emblem is from top of artwork down to bottom of wheels (y: 106 to 495)
  const storeEmblemBBox = {
    left: Math.max(0, 205 - 12),
    top: Math.max(0, 106 - 12),
    width: 700 - 205 + 24,
    height: 495 - 106 + 24,
  };
  const storeEmblemInstance = storeTransInstance.clone().extract(storeEmblemBBox);

  // 2. Process Admin Image (Image 1)
  console.log("Processing Admin assets (Image 1)...");
  const adminTransInstance = await makeTransparent({
    sourceFile: IMG_ADMIN_SOURCE,
    isAdmin: true,
    handleSeed: { x: 565, y: 110 },
  });
  const adminBBox = await findBoundingBox(adminTransInstance);
  console.log("Admin BBox:", adminBBox);

  // Admin transparent logo
  const adminTransCropped = adminTransInstance.clone().extract(adminBBox);
  await adminTransCropped.png().toFile(path.join(BRAND_DIR, "aba-mart-admin-logo-transparent.png"));

  // Admin solid white logo
  await sharp(IMG_ADMIN_SOURCE)
    .extract(adminBBox)
    .png()
    .toFile(path.join(BRAND_DIR, "aba-mart-admin-logo.png"));

  // 3. Generate Storefront PWA Icons (store-512x512.png, store-192x192.png)
  console.log("Generating Storefront PWA icons...");
  // Fit nicely inside maskable safe zone (380x380 inside 512x512)
  const storePwaBuffer = await storeTransCropped
    .clone()
    .resize(380, 380, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();
  const storePwaMeta = await sharp(storePwaBuffer).metadata();

  const store512Buffer = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      {
        input: storePwaBuffer,
        left: Math.round((512 - storePwaMeta.width) / 2),
        top: Math.round((512 - storePwaMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(ICONS_DIR, "store-512x512.png"), store512Buffer);
  await sharp(store512Buffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, "store-192x192.png"));

  // 4. Generate Admin PWA Icons (admin-512x512.png, admin-192x192.png)
  console.log("Generating Admin PWA icons...");
  const adminPwaBuffer = await adminTransCropped
    .clone()
    .resize(380, 380, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();
  const adminPwaMeta = await sharp(adminPwaBuffer).metadata();

  const admin512Buffer = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      {
        input: adminPwaBuffer,
        left: Math.round((512 - adminPwaMeta.width) / 2),
        top: Math.round((512 - adminPwaMeta.height) / 2),
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(ICONS_DIR, "admin-512x512.png"), admin512Buffer);
  await sharp(admin512Buffer).resize(192, 192).png().toFile(path.join(ICONS_DIR, "admin-192x192.png"));

  // 5. Generate Favicons
  console.log("Generating Favicon and App Icons...");
  // Create multi-size ICO from emblem (16, 32, 48, 64)
  const icoSizes = [16, 32, 48, 64];
  const icoBuffers = [];
  for (const s of icoSizes) {
    const padding = s <= 16 ? 0 : s <= 32 ? 1 : 2;
    const innerSize = s - padding * 2;
    const resizedEmblem = await storeEmblemInstance
      .clone()
      .resize(innerSize, innerSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const meta = await sharp(resizedEmblem).metadata();

    const canvas = await sharp({
      create: { width: s, height: s, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: resizedEmblem,
          left: Math.round((s - meta.width) / 2),
          top: Math.round((s - meta.height) / 2),
        },
      ])
      .png()
      .toBuffer();

    icoBuffers.push({ width: s, height: s, buffer: canvas });
  }

  const icoFileBuffer = createIco(icoBuffers);
  fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.ico"), icoFileBuffer);

  // Next.js App Router icon: apps/web/src/app/icon.png
  const appIcon32 = await storeEmblemInstance
    .clone()
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(SRC_APP_DIR, "icon.png"), appIcon32);

  // Also remove or replace icon.svg to prevent it overriding the favicon
  const svgPath = path.join(SRC_APP_DIR, "icon.svg");
  if (fs.existsSync(svgPath)) {
    fs.unlinkSync(svgPath);
    console.log("Removed old placeholder icon.svg so icon.png and favicon.ico take full effect.");
  }

  console.log("All brand assets successfully generated!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
