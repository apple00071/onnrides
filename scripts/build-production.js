const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in production mode
process.env.NODE_ENV = 'production';

console.log('🚀 Starting production build process...');

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true });
  }
  if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true });
  }

  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install --production', { stdio: 'inherit' });

  // Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Run the production build
  console.log('🏗️ Building for production...');
  execSync('next build', { stdio: 'inherit' });

  console.log('✅ Production build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
} 