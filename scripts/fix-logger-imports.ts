import * as fs from 'fs';
import * as path from 'path';

function fixLoggerImports(filePath: string): void {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Fix named imports to default import
    content = content.replace(
      /import\s*{\s*logger\s*}\s*from\s*['"](@\/lib\/logger|\.\.\/logger|\.\/logger)['"];?/g,
      'import logger from \'$1\';'
    );

    // Fix relative paths to absolute paths
    content = content.replace(
      /import\s+logger\s+from\s*['"]\.\.\/(\.\.\/)*lib\/logger['"];?/g,
      'import logger from \'@/lib/logger\';'
    );

    content = content.replace(
      /import\s+logger\s+from\s*['"]\.\/logger['"];?/g,
      'import logger from \'@/lib/logger\';'
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed logger imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

function walkDir(dir: string, callback: (filePath: string) => void): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      walkDir(filePath, callback);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      callback(filePath);
    }
  }
}

// Get the workspace root directory
const workspaceRoot = path.resolve(__dirname, '..');

// Start fixing imports
console.log('Starting to fix logger imports...');
walkDir(workspaceRoot, fixLoggerImports);
console.log('Finished fixing logger imports.'); 