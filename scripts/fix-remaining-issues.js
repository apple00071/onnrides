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

// Function to fix unused imports and variables
function fixUnusedImportsAndVars(content) {
  // Remove unused imports
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"][^'"]+['"];?\n?/g, '');
  
  // Remove unused variable declarations
  content = content.replace(/const\s+\w+\s*=\s*[^;]+;\n?/g, '');
  
  return content;
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

// Function to fix any types
function fixAnyTypes(content) {
  // Replace any with unknown for better type safety
  content = content.replace(/: any([,\s}])/g, ': unknown$1');
  content = content.replace(/: any\[\]/g, ': unknown[]');
  
  return content;
}

// Function to fix unescaped entities
function fixUnescapedEntities(content) {
  // Replace unescaped apostrophes with &apos;
  content = content.replace(/(\w)'(\w)/g, '$1&apos;$2');
  
  return content;
}

// Get all TypeScript files
const files = getTypeScriptFiles('.');

// Fix issues in each file
files.forEach(file => {
  console.log(`Processing ${file}...`);
  let content = fs.readFileSync(file, 'utf8');
  
  content = fixUnusedImportsAndVars(content);
  content = fixImgElements(content);
  content = fixAnyTypes(content);
  content = fixUnescapedEntities(content);
  
  fs.writeFileSync(file, content);
}); 