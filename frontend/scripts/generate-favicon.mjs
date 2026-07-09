/**
 * Génère favicon.ico (16, 32, 48px) et icon-512.png à partir d'un SVG maple leaf.
 * Usage: node scripts/generate-favicon.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const APP    = path.join(__dirname, '..', 'app');

// SVG feuille d'érable sur fond transparent (viewBox 200x200)
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <circle cx="100" cy="100" r="100" fill="#C1392B"/>
  <path fill="#ffffff" d="
    M100,22
    L108,50 L126,35 L119,62 L145,52 L133,78 L160,70 L140,94
    L152,100 L126,112 L118,107 L118,178
    L82,178 L82,107 L74,112 L48,100 L60,94
    L40,70 L67,78 L55,52 L81,62 L74,35 L92,50 Z
  "/>
</svg>`;

const svgBuf = Buffer.from(SVG);

// Générer les tailles pour l'ICO
async function toPngBuffer(size) {
  return sharp(svgBuf).resize(size, size).png().toBuffer();
}

// Écrire ICO multi-résolution (16, 32, 48)
async function writeIco(sizes, outPath) {
  const pngs = await Promise.all(sizes.map(toPngBuffer));

  // Format ICO : header + directory + données
  const NUM = sizes.length;
  const HEADER_SIZE = 6;
  const ENTRY_SIZE  = 16;
  const DIR_SIZE    = HEADER_SIZE + NUM * ENTRY_SIZE;

  let offset = DIR_SIZE;
  const entries = pngs.map((buf, i) => {
    const size = sizes[i];
    const entry = { size, buf, offset };
    offset += buf.length;
    return entry;
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(NUM, 4);

  const dir = Buffer.concat(entries.map(({ size, buf, offset: off }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0); // width
    e.writeUInt8(size === 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // color count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(off, 12);
    return e;
  }));

  const ico = Buffer.concat([header, dir, ...entries.map(e => e.buf)]);
  writeFileSync(outPath, ico);
  console.log(`✅ ${outPath} (${ico.length} bytes)`);
}

// Générer favicon.ico (16, 32, 48)
await writeIco([16, 32, 48], path.join(PUBLIC, 'favicon.ico'));

// Générer icon-512.png pour PWA / manifest
await sharp(svgBuf).resize(512, 512).png().toFile(path.join(PUBLIC, 'icon-512.png'));
console.log('✅ public/icon-512.png');

// Générer icon-192.png
await sharp(svgBuf).resize(192, 192).png().toFile(path.join(PUBLIC, 'icon-192.png'));
console.log('✅ public/icon-192.png');

// Remplacer app/icon.svg par une version propre
import { writeFileSync as wf } from 'fs';
wf(path.join(APP, 'icon.svg'), SVG.replace(' width="200" height="200"', '').replace('viewBox="0 0 200 200"', 'viewBox="0 0 200 200" width="200" height="200"'));

console.log('\n🍁 Favicons générés avec succès !');
