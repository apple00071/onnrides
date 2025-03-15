#!/usr/bin/env node
/**
 * Script to prepare for Vercel deployment by fixing known issues and optimizing content
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { version } = process;

console.log('🚀 Preparing for Vercel deployment...');
console.log(`Node.js version: ${process.version}`);

// Define optimization scripts to run
const optimizationScripts = [
  'fix:nextjs-config',    // Fix Next.js configuration issues
  'optimize:images',      // Optimize images
  'cleanup:vercel',       // Remove unnecessary files
  'cleanup:cache'         // Clear Next.js cache
];

/**
 * Run optimization scripts in sequence
 */
async function runOptimizations() {
  console.log('\n🔧 Running optimization scripts...');
  
  for (const script of optimizationScripts) {
    console.log(`\n📦 Running npm run ${script}...`);
    try {
      execSync(`npm run ${script}`, { stdio: 'inherit' });
      console.log(`✅ Successfully ran ${script}`);
    } catch (error) {
      console.error(`❌ Failed to run ${script}: ${error.message}`);
      
      // Don't exit on failure, continue with other optimizations
      console.log('⚠️ Continuing with other optimizations...');
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Run optimizations
    await runOptimizations();
    
    console.log('\n✅ All done! Your project is ready for Vercel deployment.');
    console.log('🔍 Remember to check the deployment logs for any issues.');
    
    // Final checklist
    console.log('\n📋 Final checklist:');
    console.log('1. Verify your .vercelignore file is up to date');
    console.log('2. Ensure all environment variables are set in Vercel dashboard');
    console.log('3. Review build commands in Vercel project settings');
    
    console.log('\n🚀 Happy deploying!');
  } catch (error) {
    console.error(`\n❌ Error during preparation: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(`\n❌ Unexpected error: ${error.message}`);
  process.exit(1);
}); 