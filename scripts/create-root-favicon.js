// This script generates high-quality favicon PNG files for browsers
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const logoPath = path.join(__dirname, '../public/logo.png');
const faviconDir = path.join(__dirname, '../public');

async function createFavicons() {
  console.log('Creating high-quality favicons...');
  
  try {
    // Create a square version of the logo with padding
    const squareLogo = await sharp(logoPath)
      .resize({
        width: 512,
        height: 512,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toBuffer();
    
    // Generate standard favicons as PNGs in the root directory
    await sharp(squareLogo)
      .resize(32, 32)
      .png()
      .toFile(path.join(faviconDir, 'favicon.png'));
    
    await sharp(squareLogo)
      .resize(192, 192)
      .png()
      .toFile(path.join(faviconDir, 'favicon-192.png'));
    
    await sharp(squareLogo)
      .resize(512, 512)
      .png()
      .toFile(path.join(faviconDir, 'favicon-512.png'));
    
    console.log('Successfully created favicons in the public directory');
  } catch (error) {
    console.error('Error creating favicons:', error);
  }
}

createFavicons().catch(console.error); 