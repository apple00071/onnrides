import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

const workspaceRoot = resolve(__dirname, '..');

async function* getFiles(dir: string): AsyncGenerator<string> {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory() && !dirent.name.startsWith('.') && !dirent.name.includes('node_modules')) {
      yield* getFiles(res);
    } else if (dirent.isFile() && (dirent.name.endsWith('.ts') || dirent.name.endsWith('.tsx'))) {
      yield res;
    }
  }
}

async function updateFile(filePath: string) {
  try {
    let content = await readFile(filePath, 'utf-8');
    let modified = false;

    // Remove logger imports
    if (content.includes("") || 
        content.includes("") ||
        content.includes("")) {
      content = content.replace(/import .*logger.*from.*['"].*logger['"];?\n?/g, '');
      modified = true;
    }

    // Replace logger usage with console
    type ReplacementFunction = (match: string, args: string) => string;
    const replacements: [RegExp, ReplacementFunction][] = [
      [/logger\.error\((.*?)\)/g, (_: string, args: string) => `console.error(${args})`],
      [/logger\.warn\((.*?)\)/g, (_: string, args: string) => `console.warn(${args})`],
      [/logger\.info\((.*?)\)/g, (_: string, args: string) => `console.log(${args})`],
      [/logger\.debug\((.*?)\)/g, (_: string, args: string) => `console.log(${args})`],
      [/logger\.log\((.*?)\)/g, (_: string, args: string) => `console.log(${args})`]
    ];

    for (const [pattern, replacer] of replacements) {
      if (content.match(pattern)) {
        content = content.replace(pattern, replacer);
        modified = true;
      }
    }

    if (modified) {
      console.log(`Updating file: ${filePath}`);
      await writeFile(filePath, content, 'utf-8');
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

async function main() {
  try {
    console.log('Starting logger removal process...');
    for await (const file of getFiles(workspaceRoot)) {
      await updateFile(file);
    }
    console.log('Logger removal process completed.');
  } catch (error) {
    console.error('Error during logger removal:', error);
    process.exit(1);
  }
}

main(); 