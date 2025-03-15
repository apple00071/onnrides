// Script to generate a clean screenshot for the admin PWA
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SCREENSHOT_PATH = path.join(__dirname, '../public/admin/screenshot-dashboard.png');
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;

async function generateAdminScreenshot() {
  console.log('Generating clean admin dashboard screenshot...');

  try {
    // Create a new image with gradient background
    const svg = `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f26e24;stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:#f26e24;stop-opacity:0.05" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#fafafa" />
      <rect width="100%" height="100%" fill="url(#grad)" />
      
      <!-- Header Bar -->
      <rect x="0" y="0" width="${OUTPUT_WIDTH}" height="64" fill="#ffffff" />
      <rect x="0" y="64" width="${OUTPUT_WIDTH}" height="2" fill="#f1f1f1" />
      
      <!-- Logo -->
      <circle cx="40" cy="32" r="20" fill="#f8f0eb" />
      <circle cx="40" cy="32" r="12" fill="#f26e24" fill-opacity="0.8" />
      
      <!-- Header Text -->
      <rect x="70" y="24" width="120" height="16" rx="2" fill="#333333" />
      
      <!-- Stats Cards -->
      <rect x="20" y="84" width="${(OUTPUT_WIDTH - 60) / 2}" height="120" rx="8" fill="#ffffff" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      <rect x="${20 + (OUTPUT_WIDTH - 60) / 2 + 20}" y="84" width="${(OUTPUT_WIDTH - 60) / 2}" height="120" rx="8" fill="#f26e24" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      <rect x="20" y="84 + 140" width="${(OUTPUT_WIDTH - 60) / 2}" height="120" rx="8" fill="#4f46e5" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      <rect x="${20 + (OUTPUT_WIDTH - 60) / 2 + 20}" y="84 + 140" width="${(OUTPUT_WIDTH - 60) / 2}" height="120" rx="8" fill="#ffffff" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      
      <!-- Booking Cards -->
      <rect x="20" y="364" width="${OUTPUT_WIDTH - 40}" height="24" rx="2" fill="#333333" fill-opacity="0.8" />
      <rect x="20" y="404" width="${OUTPUT_WIDTH - 40}" height="80" rx="8" fill="#ffffff" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      <rect x="20" y="500" width="${OUTPUT_WIDTH - 40}" height="80" rx="8" fill="#ffffff" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      <rect x="20" y="596" width="${OUTPUT_WIDTH - 40}" height="80" rx="8" fill="#ffffff" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.05))" />
      
      <!-- Bottom Navigation -->
      <rect x="0" y="${OUTPUT_HEIGHT - 64}" width="${OUTPUT_WIDTH}" height="64" fill="#ffffff" filter="drop-shadow(0px -1px 3px rgba(0,0,0,0.1))" />
      <rect x="${OUTPUT_WIDTH/5 * 0}" y="${OUTPUT_HEIGHT - 64}" width="${OUTPUT_WIDTH/5}" height="64" fill="#ffffff" />
      <rect x="${OUTPUT_WIDTH/5 * 1}" y="${OUTPUT_HEIGHT - 64}" width="${OUTPUT_WIDTH/5}" height="64" fill="#ffffff" />
      <rect x="${OUTPUT_WIDTH/5 * 2}" y="${OUTPUT_HEIGHT - 64}" width="${OUTPUT_WIDTH/5}" height="64" fill="#ffffff" />
      <rect x="${OUTPUT_WIDTH/5 * 3}" y="${OUTPUT_HEIGHT - 64}" width="${OUTPUT_WIDTH/5}" height="64" fill="#ffffff" />
      <rect x="${OUTPUT_WIDTH/5 * 4}" y="${OUTPUT_HEIGHT - 64}" width="${OUTPUT_WIDTH/5}" height="64" fill="#ffffff" />
      <rect x="${OUTPUT_WIDTH/5 * 0 + OUTPUT_WIDTH/10 - 15}" y="${OUTPUT_HEIGHT - 32}" width="30" height="4" rx="2" fill="#f26e24" />
    </svg>
    `;

    // Add OnnRides branding
    const brandSvg = `
      <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <text x="${OUTPUT_WIDTH - 20}" y="${OUTPUT_HEIGHT - 20}" 
          font-family="Arial" font-size="16" fill="#888888" text-anchor="end">
          OnnRides Admin Dashboard
        </text>
      </svg>
    `;

    // Create the base image from SVG
    const baseImage = await sharp(Buffer.from(svg))
      .composite([
        {
          input: Buffer.from(brandSvg),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toBuffer();

    // Save the final image
    await sharp(baseImage)
      .toFile(SCREENSHOT_PATH);

    console.log(`Screenshot created successfully at: ${SCREENSHOT_PATH}`);
  } catch (error) {
    console.error('Error generating screenshot:', error);
  }
}

// Run the script
generateAdminScreenshot().catch(err => {
  console.error('Failed to generate admin screenshot:', err);
  process.exit(1);
}); 