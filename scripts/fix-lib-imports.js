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
  
  // Replace lib imports
  content = content.replace(
    /import (.*) from ['"]@\/app\/lib\/(utils|db|logger|auth|email)['"];?/g,
    'import $1 from \'@/lib/$2\';'
  );
  content = content.replace(
    /import (.*) from ['"]@\/lib\/(utils|db|logger|auth|email)['"];?/g,
    'import $1 from \'@/lib/$2\';'
  );
  content = content.replace(
    /import (.*) from ['"]\.\/(utils|db|logger|auth|email)['"];?/g,
    'import $1 from \'@/lib/$2\';'
  );
  
  fs.writeFileSync(file, content);
}); 