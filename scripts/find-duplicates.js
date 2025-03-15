/**
 * Script to find duplicate files in the project
 * This helps identify files that can be removed to reduce deployment size
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Directories to scan for duplicates
const directoriesToScan = [
  'public',
  'public/favicon',
  'public/admin',
  'public/images'
];

// File extensions to check
const extensionsToCheck = ['.png', '.jpg', '.jpeg', '.ico', '.svg', '.webp', '.gif'];

// Track files by their hash
const filesByHash = {};
const filesBySize = {};

// Function to calculate file hash
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Function to format file size
function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Function to scan directories
function scanDirectory(directory) {
  try {
    if (!fs.existsSync(directory)) {
      console.log(`Directory does not exist: ${directory}`);
      return;
    }

    console.log(`Scanning directory: ${directory}`);
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip recursively scanning directories that are already in our list
        if (!directoriesToScan.includes(filePath)) {
          scanDirectory(filePath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (extensionsToCheck.includes(ext)) {
          const fileSize = stat.size;
          
          // Store by size first
          if (!filesBySize[fileSize]) {
            filesBySize[fileSize] = [];
          }
          filesBySize[fileSize].push({
            path: filePath,
            size: fileSize,
            formattedSize: formatFileSize(fileSize)
          });
          
          // Only calculate hash when there's a potential duplicate by size
          if (filesBySize[fileSize].length > 1) {
            // Calculate hash to confirm duplication
            const fileHash = calculateFileHash(filePath);
            
            if (!filesByHash[fileHash]) {
              filesByHash[fileHash] = [];
            }
            
            filesByHash[fileHash].push({
              path: filePath,
              size: fileSize,
              formattedSize: formatFileSize(fileSize)
            });
          }
        }
      }
    });
  } catch (err) {
    console.error(`Error scanning directory ${directory}:`, err);
  }
}

// Main function
function findDuplicates() {
  console.log('Starting duplicate file scan...');
  
  // Scan each directory
  directoriesToScan.forEach(dir => {
    scanDirectory(dir);
  });
  
  // Output results - files with same hash
  console.log('\n=== Duplicate Files (Same Content) ===');
  let hasDuplicates = false;
  let potentialSavings = 0;
  
  for (const hash in filesByHash) {
    const files = filesByHash[hash];
    if (files.length > 1) {
      hasDuplicates = true;
      console.log(`\nIdentical files (${files[0].formattedSize}):`);
      
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.path}`);
        
        // Count potential savings (assuming we keep one copy)
        if (index > 0) {
          potentialSavings += file.size;
        }
      });
      
      // Suggest which ones to keep
      console.log(`  Suggestion: Keep only ${files[0].path} and remove the others`);
    }
  }
  
  if (!hasDuplicates) {
    console.log('No duplicate files found based on content.');
  } else {
    console.log(`\nPotential space savings: ${formatFileSize(potentialSavings)}`);
  }
  
  // Output results - files with same size but different content
  console.log('\n=== Files with Same Size but Different Content ===');
  let hasSameSize = false;
  
  for (const size in filesBySize) {
    const files = filesBySize[size];
    if (files.length > 1) {
      // Check if they're already identified as duplicates by hash
      const paths = files.map(f => f.path);
      let alreadyCounted = false;
      
      for (const hash in filesByHash) {
        const hashFiles = filesByHash[hash];
        if (hashFiles.length > 1) {
          const hashPaths = hashFiles.map(f => f.path);
          // If all paths in this size group are in the same hash group, skip
          if (paths.every(p => hashPaths.includes(p))) {
            alreadyCounted = true;
            break;
          }
        }
      }
      
      if (!alreadyCounted) {
        hasSameSize = true;
        console.log(`\nFiles with same size (${files[0].formattedSize}):`);
        files.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.path}`);
        });
        console.log('  Suggestion: Check if these files can be optimized or if any are unused');
      }
    }
  }
  
  if (!hasSameSize) {
    console.log('No files found with same size but different content.');
  }
  
  // Large files worth optimizing
  console.log('\n=== Large Files Worth Optimizing ===');
  const largeFiles = [];
  
  for (const size in filesBySize) {
    if (parseInt(size) > 100 * 1024) { // Larger than 100KB
      filesBySize[size].forEach(file => {
        largeFiles.push(file);
      });
    }
  }
  
  if (largeFiles.length === 0) {
    console.log('No large files found that need optimization.');
  } else {
    // Sort by size, largest first
    largeFiles.sort((a, b) => b.size - a.size);
    
    largeFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.path} (${file.formattedSize})`);
    });
    
    console.log('\nSuggestion: Optimize these large files using scripts/optimize-images.js');
  }
}

// Run the function
findDuplicates(); 