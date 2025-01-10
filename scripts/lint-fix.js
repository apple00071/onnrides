const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to recursively get all .ts and .tsx files
function getTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.next')) {
        getTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to fix console.log statements
function fixConsoleStatements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace console.log with logger.debug
  content = content.replace(/console\.log/g, 'logger.debug');
  
  // Add logger import if it doesn't exist
  if (content.includes('logger.debug') && !content.includes('import logger')) {
    content = `import logger from '@/lib/logger';\n${content}`;
  }
  
  fs.writeFileSync(filePath, content);
}

// Function to fix img elements
function fixImgElements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace <img> with Image from next/image
  if (content.includes('<img')) {
    if (!content.includes('import Image')) {
      content = `import Image from 'next/image';\n${content}`;
    }
    
    // Basic img to Image conversion
    content = content.replace(/<img([^>]*)src="([^"]*)"([^>]*)>/g, 
      '<Image$1src="$2"$3width={500} height={300} alt="Image" />');
  }
  
  fs.writeFileSync(filePath, content);
}

// Create logger.ts if it doesn't exist
if (!fs.existsSync('lib/logger.ts')) {
  const loggerContent = `
const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: console.error,
  warn: console.warn,
};

export default logger;
`;
  
  fs.mkdirSync('lib', { recursive: true });
  fs.writeFileSync('lib/logger.ts', loggerContent);
}

// Get all TypeScript files
const files = getTypeScriptFiles('.');

// Fix issues in each file
files.forEach(file => {
  console.log(`Processing ${file}...`);
  fixConsoleStatements(file);
  fixImgElements(file);
});

// Run ESLint fix
try {
  execSync('npx eslint --fix .', { stdio: 'inherit' });
  console.log('ESLint fixes applied successfully!');
} catch (error) {
  console.error('Error running ESLint fix:', error);
} 