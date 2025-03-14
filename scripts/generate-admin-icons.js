const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const logoPath = path.join(__dirname, '../public/logo.png');
const adminDir = path.join(__dirname, '../public/admin');

// Ensure the admin directory exists
if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir, { recursive: true });
}

// Define sizes for various platforms
const sizes = [
  { name: 'icon-192x192.png', width: 192, height: 192 },
  { name: 'icon-512x512.png', width: 512, height: 512 }
];

async function generateAdminIcons() {
  console.log('Starting admin icon generation...');
  
  // Read the source image
  const sourceBuffer = fs.readFileSync(logoPath);
  
  // Process each size
  for (const size of sizes) {
    const outputPath = path.join(adminDir, size.name);
    
    try {
      await sharp(sourceBuffer)
        .resize(size.width, size.height)
        .toFile(outputPath);
      
      console.log(`Created ${size.name}`);
    } catch (error) {
      console.error(`Error creating ${size.name}:`, error);
    }
  }
  
  console.log('Admin icon generation complete!');
}

generateAdminIcons().catch(err => {
  console.error('Failed to generate admin icons:', err);
  process.exit(1);
}); 