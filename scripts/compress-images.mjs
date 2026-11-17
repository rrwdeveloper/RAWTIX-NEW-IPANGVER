import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync } from 'fs';

const ASSET_DIR = new URL('../asset', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const PUBLIC_DIR = new URL('../public', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

async function compressDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await compressDir(fullPath);
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

    const webpPath = fullPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    const before = (await stat(fullPath)).size;

    await sharp(fullPath)
      .webp({ quality: 82, effort: 4 })
      .toFile(webpPath);

    const after = (await stat(webpPath)).size;
    const saved = (((before - after) / before) * 100).toFixed(1);
    console.log(`✓ ${entry.name}  ${(before/1024/1024).toFixed(2)}MB → ${(after/1024/1024).toFixed(2)}MB  (-${saved}%)`);
  }
}

console.log('=== Compressing asset/ ===');
await compressDir(ASSET_DIR);

console.log('\n=== Compressing public/ ===');
await compressDir(PUBLIC_DIR);

console.log('\nDone! 🎉');
