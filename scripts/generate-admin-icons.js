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

// Define sizes for various platforms with padding configuration
const sizes = [
  { name: 'icon-192x192.png', width: 192, height: 192, padding: 16 },
  { name: 'icon-512x512.png', width: 512, height: 512, padding: 48 },
  { name: 'apple-touch-icon-120x120.png', width: 120, height: 120, padding: 10 },
  { name: 'apple-touch-icon-152x152.png', width: 152, height: 152, padding: 14 },
  { name: 'apple-touch-icon-180x180.png', width: 180, height: 180, padding: 16 },
  { name: 'apple-touch-icon.png', width: 180, height: 180, padding: 16 }
];

async function generateAdminIcons() {
  console.log('Starting admin icon generation...');
  
  try {
    // Read the source image
    const sourceBuffer = fs.readFileSync(logoPath);
    
    // Create a circular mask for iOS icons
    const createCircularMask = async (size) => {
      return Buffer.from(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white" />
        </svg>
      `);
    };
    
    // Create a rounded square mask for Android icons
    const createRoundedSquareMask = async (size, radius = size * 0.225) => {
      return Buffer.from(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white" />
        </svg>
      `);
    };
    
    // Process each size with proper padding and masks
    for (const size of sizes) {
      const outputPath = path.join(adminDir, size.name);
      
      // Calculate sizes for centered icon with padding
      const contentSize = size.width - (size.padding * 2);
      
      try {
        // Create a background
        const background = await sharp({
          create: {
            width: size.width,
            height: size.height,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          }
        }).png().toBuffer();
        
        // Resize the logo with padding
        const resizedLogo = await sharp(sourceBuffer)
          .resize(contentSize, contentSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .toBuffer();
        
        // Determine if this is an iOS icon
        const isAppleIcon = size.name.includes('apple');
        
        // Choose the appropriate mask
        const mask = isAppleIcon ? 
          await createCircularMask(size.width) : 
          await createRoundedSquareMask(size.width);
        
        // Composite the logo onto the background with the mask
        await sharp(background)
          .composite([
            {
              input: resizedLogo,
              top: size.padding,
              left: size.padding
            }
          ])
          .composite([
            {
              input: mask,
              blend: 'dest-in'
            }
          ])
          // For Apple icons, add a subtle gradient background
          .composite(isAppleIcon ? [
            {
              input: Buffer.from(`
                <svg width="${size.width}" height="${size.height}">
                  <rect width="${size.width}" height="${size.height}" fill="#f26e24" opacity="0.95" />
                </svg>
              `),
              blend: 'dest-over'
            }
          ] : [])
          .png()
          .toFile(outputPath);
        
        console.log(`Created ${size.name}`);
        
        // For PWA maskable icons (Android), create a special variant
        if (size.name === 'icon-192x192.png' || size.name === 'icon-512x512.png') {
          const maskableName = size.name.replace('.png', '-maskable.png');
          const maskablePath = path.join(adminDir, maskableName);
          
          // Create a background with the brand color
          const brandBackground = await sharp({
            create: {
              width: size.width,
              height: size.height,
              channels: 4,
              background: { r: 242, g: 110, b: 36, alpha: 1 } // #f26e24
            }
          }).png().toBuffer();
          
          // Calculate a smaller size for the logo to ensure safe zone
          const safeZoneSize = Math.floor(contentSize * 0.8);
          const safeZonePadding = Math.floor((size.width - safeZoneSize) / 2);
          
          // Resize the logo for the safe zone
          const safeZoneLogo = await sharp(sourceBuffer)
            .resize(safeZoneSize, safeZoneSize, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toBuffer();
            
          // Composite the logo onto the colored background
          await sharp(brandBackground)
            .composite([
              {
                input: safeZoneLogo,
                top: safeZonePadding,
                left: safeZonePadding
              }
            ])
            .png()
            .toFile(maskablePath);
            
          console.log(`Created ${maskableName} (maskable)`);
        }
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
  } catch (error) {
    console.error('Failed to generate admin icons:', error);
    process.exit(1);
  }
}

generateAdminIcons(); 