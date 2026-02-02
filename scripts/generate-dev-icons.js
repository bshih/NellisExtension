const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const inputDir = path.join(__dirname, '..', 'assets', 'icons');
const outputDir = path.join(__dirname, '..', 'assets', 'icons-dev');

async function generateDevIcon(size) {
  const inputPath = path.join(inputDir, `icon-${size}.png`);
  const outputPath = path.join(outputDir, `icon-${size}.png`);

  const image = await loadImage(inputPath);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw original icon
  ctx.drawImage(image, 0, 0, size, size);

  // Add green tint overlay
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(0, 200, 100, 0.3)';
  ctx.fillRect(0, 0, size, size);

  // Add a small colored corner badge
  ctx.globalCompositeOperation = 'source-over';
  const badgeSize = Math.max(4, Math.floor(size * 0.35));
  ctx.fillStyle = '#00c853';
  ctx.beginPath();
  ctx.arc(size - badgeSize / 2, badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // White border on badge
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(1, size / 32);
  ctx.stroke();

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${outputPath}`);
}

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    await generateDevIcon(size);
  }
  console.log('Dev icons generated!');
}

main().catch(console.error);
