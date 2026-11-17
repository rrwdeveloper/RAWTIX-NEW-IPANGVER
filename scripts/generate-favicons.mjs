import sharp from 'sharp';
import fs from 'fs';

// 1. Desain Logo Emblem RAWTIX: Hitam Mewah (#0B0B0B) dengan Monogram R emas (#D4AF37 / #E5D3B3) dan aksen Canting / Titik Heritage
const svgEmblem = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF5DC"/>
      <stop offset="40%" stop-color="#E2B755"/>
      <stop offset="70%" stop-color="#C59B37"/>
      <stop offset="100%" stop-color="#8C6515"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background Canvas Persegi Sudut Lembut (Sempurna untuk DOKU & Favicon) -->
  <rect width="512" height="512" rx="96" fill="url(#bgGrad)"/>
  <rect x="12" y="12" width="488" height="488" rx="84" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-opacity="0.4"/>

  <!-- Lingkaran Ornamen Batik Halus -->
  <circle cx="256" cy="256" r="195" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-dasharray="6,8" stroke-opacity="0.35"/>

  <!-- Tipografi Monogram "R" Berkelas (Heritage Elegance) -->
  <g filter="url(#shadow)">
    <path d="M 195 130 
             L 285 130 
             C 345 130 380 162 380 215 
             C 380 260 350 288 305 295 
             L 395 385 
             L 345 385 
             L 265 300 
             L 235 300 
             L 235 385 
             L 195 385 Z
             M 235 168 
             L 235 262 
             L 280 262 
             C 318 262 340 244 340 215 
             C 340 186 318 168 280 168 Z" 
          fill="url(#goldGrad)" />
          
    <!-- Titik Emas Estetika Tradisional (Golden Nok) -->
    <circle cx="395" cy="180" r="14" fill="url(#goldGrad)"/>
  </g>
</svg>
`;

async function run() {
  const svgBuffer = Buffer.from(svgEmblem.trim());

  // 1. Simpan versi SVG
  fs.writeFileSync('public/favicon.svg', svgBuffer);

  // 2. Logo High-Res untuk DOKU Merchant Profile (512x512 PNG)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile('public/rawtix-logo.png');

  // 3. Favicon standar 32x32 dan 48x48
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32x32.png');

  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile('public/favicon.ico');

  // 4. Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  console.log('✅ Semua aset logo dan favicon berhasil dibuat!');
}

run();
