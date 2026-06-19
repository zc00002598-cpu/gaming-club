/**
 * 生成应用图标 PNG (512x512) 和 ICO (256x256)
 * 运行方式: node generate-icons.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512;  // scale factor

  // 背景渐变
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#1a0a2e');
  bg.addColorStop(1, '#0d1b3e');
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, size, size, 80 * s);
  ctx.fill();

  // 盾牌形状
  const cx = size / 2;
  const cy = size / 2 - 20 * s;
  const sw = 220 * s;
  const sh = 260 * s;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - sh / 2);
  ctx.bezierCurveTo(cx + sw / 2, cy - sh / 2, cx + sw / 2, cy, cx + sw / 2, cy + sh / 6);
  ctx.bezierCurveTo(cx + sw / 2, cy + sh * 0.55, cx, cy + sh / 2, cx, cy + sh / 2);
  ctx.bezierCurveTo(cx, cy + sh / 2, cx - sw / 2, cy + sh * 0.55, cx - sw / 2, cy + sh / 6);
  ctx.bezierCurveTo(cx - sw / 2, cy, cx - sw / 2, cy - sh / 2, cx, cy - sh / 2);
  ctx.closePath();

  const shieldGrad = ctx.createLinearGradient(cx - sw / 2, cy - sh / 2, cx + sw / 2, cy + sh / 2);
  shieldGrad.addColorStop(0, '#7c3aed');
  shieldGrad.addColorStop(1, '#db2777');
  ctx.fillStyle = shieldGrad;
  ctx.fill();
  ctx.restore();

  // 盾牌内高光线条
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - sh / 2 + 10 * s);
  ctx.bezierCurveTo(cx + sw / 2 - 10 * s, cy - sh / 2 + 10 * s, cx + sw / 2 - 10 * s, cy, cx + sw / 2 - 10 * s, cy + sh / 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.restore();

  // 勾号
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 28 * s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 65 * s, cy + 10 * s);
  ctx.lineTo(cx - 15 * s, cy + 65 * s);
  ctx.lineTo(cx + 80 * s, cy - 50 * s);
  ctx.stroke();
  ctx.restore();

  return canvas;
}

const assetsDir = path.join(__dirname, 'assets');

// 生成 512x512 PNG
const canvas512 = drawIcon(512);
const pngBuffer = canvas512.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
console.log('icon.png (512x512) 已生成');

// 生成 256x256 PNG 用于 ICO
const canvas256 = drawIcon(256);
const png256Buffer = canvas256.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'icon256.png'), png256Buffer);
console.log('icon256.png (256x256) 已生成');

// 生成简单的 ICO 格式（256x256 单帧）
// ICO = header + directory + PNG data
function buildIco(pngData) {
  const pngSize = pngData.length;
  const iconCount = 1;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + dirEntrySize * iconCount;

  const buf = Buffer.alloc(dataOffset + pngSize);

  // ICO header
  buf.writeUInt16LE(0, 0);        // Reserved
  buf.writeUInt16LE(1, 2);        // Type: ICO
  buf.writeUInt16LE(iconCount, 4); // Count

  // Directory entry (256x256 PNG)
  buf.writeUInt8(0, 6);           // Width 0 = 256
  buf.writeUInt8(0, 7);           // Height 0 = 256
  buf.writeUInt8(0, 8);           // Color palette count
  buf.writeUInt8(0, 9);           // Reserved
  buf.writeUInt16LE(1, 10);       // Planes
  buf.writeUInt16LE(32, 12);      // Bits per pixel
  buf.writeUInt32LE(pngSize, 14); // Image data size
  buf.writeUInt32LE(dataOffset, 18); // Offset to image data

  pngData.copy(buf, dataOffset);
  return buf;
}

const icoBuffer = buildIco(png256Buffer);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
console.log('icon.ico (256x256) 已生成');

// 生成安装包头部横幅 (164x314 BMP 简单色块)
// electron-builder 要求特定尺寸，如没有提供则跳过
console.log('图标生成完成！');
