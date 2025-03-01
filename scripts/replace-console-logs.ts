#!/usr/bin/env ts-node
/**
 * Script to replace console.log statements with logger calls
 * 
 * Usage:
 * npx ts-node scripts/replace-console-logs.ts
 * npx ts-node scripts/replace-console-logs.ts --fix  # to perform the replacements
 * npx ts-node scripts/replace-console-logs.ts --dry-run  # to see what would be replaced without making changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const fixMode = args.includes('--fix');

// Configuration
const SOURCE_DIRS = [
  'app/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}',
];

// Skip node_modules, .next, etc.
const IGNORE_DIRS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
];

// Keep console.log in these development files
const ALLOW_LIST = [
  'scripts/**',
  '**/logger.ts'  // Don't replace console.log in the logger itself
];

function processFile(filePath: string): boolean {
  try {
    // Check if file is in allow list
    if (ALLOW_LIST.some(pattern => {
      const regexPattern = new RegExp(pattern.replace(/\*/g, '.*'));
      return regexPattern.test(filePath);
    })) {
      if (!dryRun) console.log(`Skipping allowlisted file: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // More comprehensive patterns for console.log replacements
    
    // Handle simple console.log statements with string literals
    content = content.replace(
      /console\.log\s*\(\s*(['"`])(.*?)\1\s*\)/g, 
      'logger.debug($1$2$1)'
    );

    // Handle console.log with object/variable arguments
    content = content.replace(
      /console\.log\s*\(\s*(['"`])(.*?)\1\s*,\s*([\s\S]*?)\)/g,
      (match, quote, message, args) => {
        // Preserve any trailing whitespace in the args
        const argsTrimmed = args.trimStart();
        const spaceBefore = args.substring(0, args.length - argsTrimmed.length);
        return `logger.debug(${quote}${message}${quote},${spaceBefore}${argsTrimmed})`;
      }
    );

    // Handle console.log with just variable/expression (no string message)
    content = content.replace(
      /console\.log\s*\(\s*(?!['"`])([^)]*)\s*\)/g,
      (match, args) => {
        if (args.trim()) {
          return `logger.debug(${args})`;
        }
        return match; // Don't replace empty console.log()
      }
    );

    // Handle similar patterns for console.error
    content = content.replace(
      /console\.error\s*\(\s*(['"`])(.*?)\1\s*\)/g,
      'logger.error($1$2$1)'
    );
    
    content = content.replace(
      /console\.error\s*\(\s*(['"`])(.*?)\1\s*,\s*([\s\S]*?)\)/g,
      (match, quote, message, args) => {
        const argsTrimmed = args.trimStart();
        const spaceBefore = args.substring(0, args.length - argsTrimmed.length);
        return `logger.error(${quote}${message}${quote},${spaceBefore}${argsTrimmed})`;
      }
    );
    
    content = content.replace(
      /console\.error\s*\(\s*(?!['"`])([^)]*)\s*\)/g,
      (match, args) => {
        if (args.trim()) {
          return `logger.error(${args})`;
        }
        return match;
      }
    );

    // Handle similar patterns for console.warn
    content = content.replace(
      /console\.warn\s*\(\s*(['"`])(.*?)\1\s*\)/g,
      'logger.warn($1$2$1)'
    );
    
    content = content.replace(
      /console\.warn\s*\(\s*(['"`])(.*?)\1\s*,\s*([\s\S]*?)\)/g,
      (match, quote, message, args) => {
        const argsTrimmed = args.trimStart();
        const spaceBefore = args.substring(0, args.length - argsTrimmed.length);
        return `logger.warn(${quote}${message}${quote},${spaceBefore}${argsTrimmed})`;
      }
    );
    
    content = content.replace(
      /console\.warn\s*\(\s*(?!['"`])([^)]*)\s*\)/g,
      (match, args) => {
        if (args.trim()) {
          return `logger.warn(${args})`;
        }
        return match;
      }
    );

    // Add logger import if needed
    if (content !== originalContent && !content.includes('import logger from')) {
      const importStatement = "import logger from '@/lib/logger';\n";
      
      // Try to add after existing imports
      if (content.includes('import ')) {
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLastImport = content.indexOf('\n', lastImportIndex) + 1;
        content = content.slice(0, endOfLastImport) + importStatement + content.slice(endOfLastImport);
      } else {
        // Add at the beginning if no imports exist
        content = importStatement + content;
      }
    }

    // Only write if changes were made
    if (content !== originalContent) {
      if (dryRun) {
        console.log(`Would update: ${filePath}`);
        return true;
      } else if (fixMode) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        return true;
      } else {
        console.log(`Found console.log in: ${filePath} (use --fix to replace)`);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  try {
    if (dryRun) {
      console.log('Running in dry-run mode. No changes will be made.');
    } else if (!fixMode) {
      console.log('Running in scan mode. Use --fix to replace console.log statements.');
    }

    // Find all files matching the source directories and not in ignored directories
    const files = await glob(SOURCE_DIRS, { ignore: IGNORE_DIRS });
    console.log(`Found ${files.length} files to process`);

    let filesChanged = 0;

    for (const file of files) {
      const wasChanged = processFile(file);
      if (wasChanged && (dryRun || fixMode)) {
        filesChanged++;
      }
    }

    if (dryRun) {
      console.log(`\nCompleted! Would update ${filesChanged} files.`);
    } else if (fixMode) {
      console.log(`\nCompleted! ${filesChanged} files updated.`);
    } else {
      console.log(`\nScan completed. Use --fix to replace console.log statements.`);
    }
  } catch (error) {
    console.error('Error running the script:', error);
    process.exit(1);
  }
}

// Run the script
main(); 