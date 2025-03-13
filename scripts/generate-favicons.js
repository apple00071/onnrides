// This script generates favicon files for different platforms
// Run with: node scripts/generate-favicons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const logoPath = path.join(__dirname, '../public/logo.png');
const faviconDir = path.join(__dirname, '../public/favicon');

// Ensure the favicon directory exists
if (!fs.existsSync(faviconDir)) {
  fs.mkdirSync(faviconDir, { recursive: true });
}

// Define sizes for various platforms
const sizes = [
  { name: 'favicon-16x16.png', width: 16, height: 16 },
  { name: 'favicon-32x32.png', width: 32, height: 32 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'android-chrome-192x192.png', width: 192, height: 192 },
  { name: 'android-chrome-512x512.png', width: 512, height: 512 },
  { name: 'mstile-150x150.png', width: 150, height: 150 }
];

async function generateFavicons() {
  console.log('Starting favicon generation...');
  
  // Read the source image
  const sourceBuffer = fs.readFileSync(logoPath);
  
  // Process each size
  for (const size of sizes) {
    const outputPath = path.join(faviconDir, size.name);
    
    try {
      await sharp(sourceBuffer)
        .resize(size.width, size.height)
        .toFile(outputPath);
      
      console.log(`Created ${size.name}`);
    } catch (error) {
      console.error(`Error creating ${size.name}:`, error);
    }
  }
  
  // Generate .ico file (16x16 and 32x32 combined)
  try {
    await sharp(sourceBuffer)
      .resize(32, 32)
      .toFormat('ico')
      .toFile(path.join(faviconDir, 'favicon.ico'));
    
    console.log('Created favicon.ico');
  } catch (error) {
    console.error('Error creating favicon.ico:', error);
  }
  
  console.log('Favicon generation complete!');
}

generateFavicons().catch(err => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
}); 