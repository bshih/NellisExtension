const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, '..', 'assets', 'icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - Nellis orange/red gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#e85d04');
  gradient.addColorStop(1, '#dc2f02');

  // Draw rounded rectangle background
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw "N" letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.65}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', size / 2, size / 2 + size * 0.03);

  // Draw small gavel/hammer at bottom right (for larger sizes)
  if (size >= 32) {
    const gavelSize = size * 0.25;
    const gavelX = size * 0.72;
    const gavelY = size * 0.72;

    ctx.save();
    ctx.translate(gavelX, gavelY);
    ctx.rotate(-Math.PI / 4);

    // Gavel head
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-gavelSize / 2, -gavelSize / 6, gavelSize, gavelSize / 3);

    // Gavel handle
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-gavelSize / 8, gavelSize / 6, gavelSize / 4, gavelSize / 2);

    ctx.restore();
  }

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, `icon-${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${outputPath}`);
});

console.log('All icons generated!');
