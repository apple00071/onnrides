// This script synchronizes all favicon files to ensure consistency
const fs = require('fs');
const path = require('path');

// Paths
const publicDir = path.join(__dirname, '../public');
const faviconDir = path.join(publicDir, 'favicon');

// Files to synchronize
const filesToSync = [
  { 
    src: path.join(publicDir, 'favicon.png'), 
    dest: path.join(faviconDir, 'favicon-32x32.png') 
  },
  { 
    src: path.join(publicDir, 'favicon-192.png'), 
    dest: path.join(faviconDir, 'android-chrome-192x192.png') 
  },
  { 
    src: path.join(publicDir, 'favicon-512.png'), 
    dest: path.join(faviconDir, 'android-chrome-512x512.png') 
  },
  { 
    src: path.join(publicDir, 'apple-touch-icon.png'), 
    dest: path.join(faviconDir, 'apple-touch-icon.png') 
  },
  { 
    src: path.join(publicDir, 'favicon.ico'), 
    dest: path.join(faviconDir, 'favicon.ico') 
  }
];

// Ensure the favicon directory exists
if (!fs.existsSync(faviconDir)) {
  fs.mkdirSync(faviconDir, { recursive: true });
}

// Copy files
filesToSync.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    try {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${path.basename(src)} to ${path.relative(publicDir, dest)}`);
    } catch (error) {
      console.error(`Error copying ${path.basename(src)}:`, error);
    }
  } else {
    console.warn(`Source file ${path.basename(src)} does not exist`);
  }
});

console.log('Favicon synchronization complete!'); 