const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript files
const files = execSync('git ls-files "*.ts" "*.tsx"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace logger imports
  content = content.replace(
    /import logger from ['"]@\/app\/lib\/logger['"];?/g,
    'import logger from \'@/lib/logger\';'
  );
  content = content.replace(
    /import logger from ['"]@\/lib\/logger['"];?/g,
    'import logger from \'@/lib/logger\';'
  );
  content = content.replace(
    /import logger from ['"]\.\/logger['"];?/g,
    'import logger from \'@/lib/logger\';'
  );
  
  fs.writeFileSync(file, content);
}); 