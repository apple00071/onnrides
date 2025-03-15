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
  { name: 'icon-512x512.png', width: 512, height: 512 },
  { name: 'apple-touch-icon-120x120.png', width: 120, height: 120 },
  { name: 'apple-touch-icon-152x152.png', width: 152, height: 152 },
  { name: 'apple-touch-icon-180x180.png', width: 180, height: 180 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 }
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
  
  // Generate a basic screenshot for PWA installation
  try {
    // Create a simple screenshot with the logo in the center
    const screenshotWidth = 1280;
    const screenshotHeight = 720;
    const logoSize = 200;
    
    // Create a white background with text and logo
    const screenshot = await sharp({
      create: {
        width: screenshotWidth,
        height: screenshotHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="${screenshotWidth}" height="${screenshotHeight}">
            <rect x="0" y="0" width="${screenshotWidth}" height="${screenshotHeight}" fill="#f8f9fa" />
            <rect x="0" y="0" width="${screenshotWidth}" height="80" fill="#f26e24" />
            <text x="20" y="50" font-family="Arial" font-size="28" font-weight="bold" fill="white">OnnRides Admin Dashboard</text>
            <text x="${screenshotWidth/2}" y="${screenshotHeight/2 + 100}" font-family="Arial" font-size="24" text-anchor="middle" fill="#333">Vehicle Management · Bookings · User Analytics</text>
            <text x="${screenshotWidth/2}" y="${screenshotHeight/2 + 150}" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">✓ Secure Admin Access</text>
            <text x="${screenshotWidth/2}" y="${screenshotHeight/2 + 180}" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">✓ Real-time Notifications</text>
            <text x="${screenshotWidth/2}" y="${screenshotHeight/2 + 210}" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">✓ Booking Management</text>
          </svg>
        `),
        top: 0,
        left: 0
      },
      {
        input: await sharp(sourceBuffer).resize(logoSize, logoSize).toBuffer(),
        top: Math.floor(screenshotHeight/2 - logoSize/2),
        left: Math.floor(screenshotWidth/2 - logoSize/2)
      }
    ])
    .png()
    .toFile(path.join(adminDir, 'screenshot-dashboard.png'));
    
    console.log('Created screenshot-dashboard.png');
  } catch (error) {
    console.error('Error creating screenshot:', error);
  }
  
  console.log('Admin icon generation complete!');
}

generateAdminIcons().catch(err => {
  console.error('Failed to generate admin icons:', err);
  process.exit(1);
}); 