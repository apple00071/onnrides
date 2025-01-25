const https = require('https');
const fs = require('fs');
const path = require('path');

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
           .on('error', reject)
           .once('close', () => resolve(filepath));
      } else {
        res.resume();
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
      }
    });
  });
};

const images = {
  'hero-car.jpg': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80',
  'rental-services.jpg': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
  'avatar-1.jpg': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
  'avatar-2.jpg': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
  'avatar-3.jpg': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80',
  'location-1.jpg': 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=400&q=80',
  'location-2.jpg': 'https://images.unsplash.com/photo-1573950940509-d924ee3fd345?w=400&q=80',
  'location-3.jpg': 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&q=80',
  'location-4.jpg': 'https://images.unsplash.com/photo-1555626906-fcf10d6851b4?w=400&q=80',
  'location-5.jpg': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80',
};

async function downloadAllImages() {
  const publicDir = path.join(process.cwd(), 'public');
  const imagesDir = path.join(publicDir, 'images');

  // Create directories if they don't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }

  console.log('Downloading images...');
  
  for (const [filename, url] of Object.entries(images)) {
    const filepath = path.join(imagesDir, filename);
    try {
      await downloadImage(url, filepath);
      console.log(`✓ Downloaded ${filename}`);
    } catch (err) {
      console.error(`✗ Error downloading ${filename}:`, err.message);
    }
  }
}

downloadAllImages().then(() => {
  console.log('All downloads completed!');
}).catch(err => {
  console.error('Script failed:', err);
}); 
