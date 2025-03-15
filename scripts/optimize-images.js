/**
 * Script to optimize images for reduced deployment size
 * Requires sharp: npm install sharp
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('Starting image optimization process...');

// Images to optimize with their target sizes
const imagesToOptimize = [
  {
    source: 'public/hero.png',
    target: 'public/hero.png',
    width: 1920,
    height: null, // maintain aspect ratio
    quality: 80
  },
  {
    source: 'public/Car Banner.png',
    target: 'public/Car Banner.png',
    width: 1200,
    height: null, // maintain aspect ratio
    quality: 80
  },
  {
    source: 'public/hero-mobile.png',
    target: 'public/hero-mobile.png',
    width: 640,
    height: null, // maintain aspect ratio
    quality: 80
  },
  // Favicon optimizations
  {
    source: 'public/favicon-512.png',
    target: 'public/favicon-512.png',
    width: 512,
    height: 512,
    quality: 90
  },
  {
    source: 'public/favicon-192.png',
    target: 'public/favicon-192.png',
    width: 192,
    height: 192,
    quality: 90
  },
  {
    source: 'public/admin/icon-512x512.png',
    target: 'public/admin/icon-512x512.png',
    width: 512,
    height: 512,
    quality: 90
  },
  {
    source: 'public/admin/icon-192x192.png',
    target: 'public/admin/icon-192x192.png',
    width: 192,
    height: 192,
    quality: 90
  }
];

// Function to get file size in KB
function getFileSizeInKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(2);
  } catch (err) {
    return '0';
  }
}

// Process each image
async function optimizeImage(imageConfig) {
  try {
    if (!fs.existsSync(imageConfig.source)) {
      console.log(`Source image not found: ${imageConfig.source}`);
      return;
    }

    const originalSize = getFileSizeInKB(imageConfig.source);
    console.log(`Optimizing: ${imageConfig.source} (${originalSize} KB)`);

    // Create directory for target if it doesn't exist
    const targetDir = path.dirname(imageConfig.target);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Backup original file
    const backupPath = `${imageConfig.source}.backup`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(imageConfig.source, backupPath);
      console.log(`Backup created: ${backupPath}`);
    }

    // Process the image
    let sharpInstance = sharp(imageConfig.source);
    
    // Resize if dimensions provided
    if (imageConfig.width || imageConfig.height) {
      sharpInstance = sharpInstance.resize(imageConfig.width, imageConfig.height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }
    
    // Save with quality setting
    await sharpInstance
      .png({ quality: imageConfig.quality })
      .toFile(`${imageConfig.target}.temp`);
    
    // Replace original with optimized version
    fs.unlinkSync(imageConfig.source);
    fs.renameSync(`${imageConfig.target}.temp`, imageConfig.target);
    
    const newSize = getFileSizeInKB(imageConfig.target);
    const savings = (originalSize - newSize).toFixed(2);
    const savingsPercent = ((savings / originalSize) * 100).toFixed(2);
    
    console.log(`Optimized: ${imageConfig.target} (${newSize} KB, saved ${savings} KB, ${savingsPercent}%)`);
  } catch (err) {
    console.error(`Error optimizing ${imageConfig.source}: ${err.message}`);
  }
}

// Main function
async function optimizeImages() {
  for (const imageConfig of imagesToOptimize) {
    await optimizeImage(imageConfig);
  }
  console.log('Image optimization completed!');
}

// Run the optimization
optimizeImages().catch(err => {
  console.error('Error in image optimization process:', err);
}); 