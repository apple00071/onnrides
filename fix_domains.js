const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else {
      if (!file.includes('package-lock.json') && !file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.ico') && !file.endsWith('.svg') && !file.endsWith('.webmanifest')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/onnrides');
let count = 0;
files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/Mister Rides\.com/g, 'misterrides.com');
    newContent = newContent.replace(/Mister Rides@gmail\.com/g, 'misterrides@gmail.com');
    newContent = newContent.replace(/@misterrides/g, '@misterrides');
    
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      count++;
    }
  } catch (e) {
    console.error(`Error processing ${file}: ${e.message}`);
  }
});
console.log(`Updated ${count} files.`);
