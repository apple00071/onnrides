import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const globPromise = promisify(glob);

const IGNORED_DIRS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'scripts'
];

const IGNORED_FILES = [
  'lib/logger.ts'
];

async function fixConsoleLogsInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace console.log with logger.debug
  if (content.includes('console.log')) {
    content = content.replace(/console\.log\(/g, 'logger.debug(');
    modified = true;
  }

  // Replace console.error with logger.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
  }

  // Replace console.warn with logger.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
  }

  // Replace console.info with logger.info
  if (content.includes('console.info')) {
    content = content.replace(/console\.info\(/g, 'logger.info(');
    modified = true;
  }

  // Add logger import if needed
  if (modified && !content.includes('import { logger }')) {
    content = `import { logger } from '@/lib/logger';\n${content}`;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed console logs in: ${filePath}`);
  }
}

async function main() {
  try {
    const files = await globPromise('**/*.{ts,tsx,js,jsx}', {
      ignore: [
        ...IGNORED_DIRS.map(dir => `**/${dir}/**`),
        ...IGNORED_FILES
      ],
      nodir: true
    });

    console.log('Files to process:', files.length);

    for (const file of files) {
      await fixConsoleLogsInFile(file);
    }

    console.log('Finished processing files');
  } catch (error) {
    console.error('Error processing files:', error);
    process.exit(1);
  }
}

main(); 