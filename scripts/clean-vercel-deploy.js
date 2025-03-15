/**
 * Script to clean up files before deployment to Vercel
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Starting cleanup process for Vercel deployment...');

// Files to be removed
const filesToRemove = [
  // Duplicate favicon files (keep only necessary ones)
  'public/favicon/android-chrome-512x512.png', // Keep only public/favicon-512.png
  'public/apple-touch-icon.png',             // Keep only in favicon directory
  'public/favicon-192.png',                  // Keep only android-chrome-192x192.png

  // Large unused images
  'public/hero.png',                         // Extremely large (1.9MB) - optimize before using
  'public/Car Banner.png',                   // Large (1.4MB) - optimize before using
  'public/images/7xm.xyz418925.png',         // Large (1.5MB) - unused sample image
  
  // Empty placeholder files that serve no purpose
  'public/admin/screenshot-dashboard.png',   // Just a placeholder (can recreate when needed)
  
  // Whatsapp auth directories (should not be in version control or deployment)
  '.wwebjs_auth',
  'whatsapp-sessions',
  
  // Build artifacts that don't need to be deployed
  '.next/cache',                        // Webpack cache not needed in production
];

// Directories to clean up
const directoriesToClean = [
  '.next/cache/webpack',              // Webpack cache
];

// Process to clean up files
function cleanFiles() {
  filesToRemove.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Removed: ${file}`);
      }
    } catch (err) {
      console.error(`Error removing ${file}: ${err.message}`);
    }
  });
}

// Process to clean up directories
function cleanDirectories() {
  directoriesToClean.forEach(dir => {
    try {
      if (fs.existsSync(dir)) {
        console.log(`Cleaning directory: ${dir}`);
        fs.rmdirSync(dir, { recursive: true });
        console.log(`Cleaned: ${dir}`);
      }
    } catch (err) {
      console.error(`Error cleaning ${dir}: ${err.message}`);
    }
  });
}

// Optimize images
function optimizeImages() {
  // Only perform this if you have sharp installed
  try {
    exec('npm list sharp', (error, stdout, stderr) => {
      if (!error) {
        console.log('Sharp is installed. Optimizing images...');
        // Add your image optimization code here using sharp
      } else {
        console.log('Sharp is not installed. Skipping image optimization.');
      }
    });
  } catch (err) {
    console.error(`Error checking for sharp: ${err.message}`);
  }
}

// Main cleanup process
function cleanup() {
  console.log('Cleaning files...');
  cleanFiles();
  
  console.log('Cleaning directories...');
  cleanDirectories();
  
  console.log('Optimizing images...');
  optimizeImages();
  
  console.log('Cleanup process completed.');
}

// Run the cleanup
cleanup(); 