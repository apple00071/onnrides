const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

console.log(`${colors.bright}Starting production build...${colors.reset}\n`);

try {
  // Run database migrations
  console.log(`${colors.yellow}Running database migrations...${colors.reset}`);
  execSync('npm run migrate', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Migrations completed${colors.reset}\n`);

  // Build the Next.js application
  console.log(`${colors.yellow}Building Next.js application...${colors.reset}`);
  execSync('next build', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Next.js build completed${colors.reset}\n`);

  console.log(`${colors.bright}${colors.green}Production build completed successfully!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Build failed:${colors.reset}`, error);
  process.exit(1);
} 