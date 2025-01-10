const fs = require('fs');
const path = require('path');

// Function to recursively get all TypeScript files
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

// Function to fix unused imports
function fixUnusedImports(content) {
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"][^'"]+['"]/g;
  let matches;
  let newContent = content;
  
  while ((matches = importRegex.exec(content)) !== null) {
    const imports = matches[1].split(',').map(i => i.trim());
    const usedImports = imports.filter(imp => {
      const name = imp.split(' as ')[0].trim();
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      const count = (content.match(regex) || []).length;
      return count > 1; // More than 1 because the import statement itself counts as 1
    });
    
    if (usedImports.length === 0) {
      newContent = newContent.replace(matches[0], '');
    } else if (usedImports.length !== imports.length) {
      const newImport = `import { ${usedImports.join(', ')} } from ${matches[0].split('from')[1].trim()}`;
      newContent = newContent.replace(matches[0], newImport);
    }
  }
  
  return newContent;
}

// Function to fix img elements
function fixImgElements(content) {
  if (!content.includes('<img')) return content;
  
  let newContent = content;
  
  // Add Image import if needed
  if (!content.includes('import Image')) {
    newContent = `import Image from 'next/image';\n${newContent}`;
  }
  
  // Replace img tags with Image components
  newContent = newContent.replace(
    /<img([^>]*)src="([^"]*)"([^>]*)>/g,
    (match, before, src, after) => {
      // Extract width and height if they exist
      const widthMatch = match.match(/width="(\d+)"/);
      const heightMatch = match.match(/height="(\d+)"/);
      const width = widthMatch ? widthMatch[1] : '500';
      const height = heightMatch ? heightMatch[1] : '300';
      
      // Extract alt if it exists
      const altMatch = match.match(/alt="([^"]*)"/);
      const alt = altMatch ? altMatch[1] : 'Image';
      
      return `<Image${before}src="${src}"${after} width={${width}} height={${height}} alt="${alt}" />`;
    }
  );
  
  return newContent;
}

// Function to fix console statements
function fixConsoleStatements(content) {
  if (!content.includes('console.')) return content;
  
  let newContent = content;
  
  // Add logger import if needed
  if (!content.includes('import logger')) {
    newContent = `import logger from '@/lib/logger';\n${newContent}`;
  }
  
  // Replace console statements
  newContent = newContent
    .replace(/console\.log/g, 'logger.debug')
    .replace(/console\.error/g, 'logger.error')
    .replace(/console\.warn/g, 'logger.warn');
  
  return newContent;
}

// Create logger.ts if it doesn't exist
if (!fs.existsSync('lib/logger.ts')) {
  const loggerContent = `
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  },
  warn: console.warn,
  error: console.error,
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
  let content = fs.readFileSync(file, 'utf8');
  
  content = fixUnusedImports(content);
  content = fixImgElements(content);
  content = fixConsoleStatements(content);
  
  fs.writeFileSync(file, content);
}); 