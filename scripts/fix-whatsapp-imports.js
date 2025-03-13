const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to update imports in a file
function updateImports(filePath) {
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file imports WhatsApp service
    if (
      content.includes("from './service'") || 
      content.includes("from '../service'") || 
      content.includes("from '../whatsapp/service'") || 
      content.includes("from '../lib/whatsapp/service'") || 
      content.includes("from '@/lib/whatsapp/service'") || 
      content.includes("from 'lib/whatsapp/service'") || 
      content.includes("from '/lib/whatsapp/service'") || 
      content.includes("from './whatsapp/service'")
    ) {
      // Replace with the correct import path
      const updatedContent = content.replace(
        /from ['"](?:\.\.?\/)+(?:lib\/)?whatsapp\/service['"]/g,
        "from '@/app/lib/whatsapp/service'"
      ).replace(
        /from ['"](?:@\/|\/)?(?:lib\/)?whatsapp\/service['"]/g,
        "from '@/app/lib/whatsapp/service'"
      ).replace(
        /from ['"]\.\/service['"]/g,
        "from '@/app/lib/whatsapp/service'"
      );
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Updated imports in ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Find all TypeScript/JavaScript files
const files = glob.sync('**/*.{ts,js,tsx,jsx}', {
  ignore: ['node_modules/**', '.next/**', 'out/**', '.vercel/**', 'scripts/fix-whatsapp-imports.js']
});

console.log(`Found ${files.length} files to check...`);

// Process each file
let updatedCount = 0;
for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  const updated = updateImports(filePath);
  if (updated) updatedCount++;
}

console.log(`Completed import update. Updated ${updatedCount} files.`); 