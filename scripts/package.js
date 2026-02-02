const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const pkg = require('../package.json');
const outputDir = path.join(__dirname, '..', 'release');
const outputFile = path.join(outputDir, `nellis-auction-helper-v${pkg.version}.zip`);

// Ensure release dir exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created ${outputFile} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add files to zip
archive.file('manifest.json', { name: 'manifest.json' });
archive.directory('dist/', 'dist');
archive.directory('popup/', 'popup');
archive.directory('assets/', 'assets');

archive.finalize();
