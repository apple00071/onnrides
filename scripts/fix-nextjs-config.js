#!/usr/bin/env node
/**
 * Script to fix Next.js configuration issues for compatibility with Next.js 14+
 * This script checks for deprecated or unsupported options in next.config.js
 * and removes or updates them to ensure compatibility with the latest version.
 */
const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const CONFIG_PATH = path.join(process.cwd(), 'next.config.js');

async function fixNextJsConfig() {
  console.log('🔍 Checking Next.js configuration for compatibility issues...');
  
  try {
    // Read the current config file
    let configContent = await readFile(CONFIG_PATH, 'utf8');
    let originalContent = configContent;
    let madeChanges = false;
    
    // Check for known problematic options
    
    // 1. Remove quality property from images config (not supported in Next.js 14+)
    if (configContent.includes('quality:')) {
      console.log('⚠️  Found unsupported "quality" property in images configuration');
      configContent = configContent.replace(/quality:\s*\d+,?\s*(\n|\r\n)/g, '');
      madeChanges = true;
      console.log('✅ Removed "quality" property (use device-specific formats like WebP or AVIF instead)');
    }
    
    // 2. Check for poweredByHeader in experimental (moved to top level in Next.js 14+)
    if (configContent.includes('experimental') && configContent.includes('poweredByHeader')) {
      console.log('⚠️  Found "poweredByHeader" in experimental section');
      
      // Remove from experimental
      configContent = configContent.replace(/poweredByHeader:\s*(true|false),?\s*(\n|\r\n)/g, '');
      
      // Add at top level if not already there
      if (!configContent.match(/poweredByHeader:\s*(true|false)/)) {
        configContent = configContent.replace(
          /const nextConfig = {/,
          'const nextConfig = {\n  poweredByHeader: false,'
        );
      }
      
      madeChanges = true;
      console.log('✅ Moved "poweredByHeader" from experimental to top level configuration');
    }
    
    // 3. Check for unsupported webpack configuration
    // Add more checks as needed for other unsupported options
    
    // Save changes if needed
    if (madeChanges) {
      await writeFile(CONFIG_PATH, configContent, 'utf8');
      console.log('🔄 Updated next.config.js with compatible options');
      console.log('⚠️  You may need to restart your development server for changes to take effect');
    } else {
      console.log('✅ No compatibility issues found in Next.js configuration');
    }
    
    // Provide a summary of what was changed
    if (madeChanges) {
      console.log('\n📝 Summary of changes:');
      console.log('- Removed unsupported "quality" property from images config');
      console.log('- Fixed experimental configuration options');
      console.log('\n');
    }
    
  } catch (error) {
    console.error(`❌ Error fixing Next.js configuration: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
fixNextJsConfig().catch(err => {
  console.error(`❌ Unexpected error: ${err.message}`);
  process.exit(1);
}); 