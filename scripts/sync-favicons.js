// This script ensures all favicon files are in the correct locations
const fs = require('fs');
const path = require('path');

// Paths
const publicDir = path.join(__dirname, '../public');
const faviconDir = path.join(publicDir, 'favicon');

// Files to ensure are in both locations
const filesToSync = [
  { name: 'favicon.ico', ensureInRoot: true, ensureInFaviconDir: true },
  { name: 'favicon.png', ensureInRoot: true, ensureInFaviconDir: false },
  { name: 'favicon-192.png', ensureInRoot: true, ensureInFaviconDir: false },
  { name: 'favicon-512.png', ensureInRoot: true, ensureInFaviconDir: false },
  { name: 'apple-touch-icon.png', ensureInRoot: true, ensureInFaviconDir: true },
  { name: 'android-chrome-192x192.png', ensureInRoot: false, ensureInFaviconDir: true },
  { name: 'android-chrome-512x512.png', ensureInRoot: false, ensureInFaviconDir: true },
  { name: 'favicon-32x32.png', ensureInRoot: false, ensureInFaviconDir: true },
  { name: 'favicon-16x16.png', ensureInRoot: false, ensureInFaviconDir: true },
  { name: 'site.webmanifest', ensureInRoot: false, ensureInFaviconDir: true },
];

// Ensure the favicon directory exists
if (!fs.existsSync(faviconDir)) {
  fs.mkdirSync(faviconDir, { recursive: true });
  console.log('Created favicon directory');
}

// Copy files to ensure they're in all required locations
filesToSync.forEach(({ name, ensureInRoot, ensureInFaviconDir }) => {
  const rootPath = path.join(publicDir, name);
  const faviconPath = path.join(faviconDir, name);
  
  // Check if file exists in either location
  const existsInRoot = fs.existsSync(rootPath);
  const existsInFaviconDir = fs.existsSync(faviconPath);
  
  if (existsInRoot && ensureInFaviconDir && !existsInFaviconDir) {
    // Copy from root to favicon dir
    fs.copyFileSync(rootPath, faviconPath);
    console.log(`Copied ${name} from root to favicon directory`);
  } else if (existsInFaviconDir && ensureInRoot && !existsInRoot) {
    // Copy from favicon dir to root
    fs.copyFileSync(faviconPath, rootPath);
    console.log(`Copied ${name} from favicon directory to root`);
  } else if (!existsInRoot && !existsInFaviconDir) {
    console.warn(`Warning: ${name} not found in either location`);
  }
});

console.log('Favicon synchronization complete!'); 