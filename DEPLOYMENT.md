# Optimizing Vercel Deployment Size

This document provides guidance on how to keep your Vercel deployment size small and optimize performance.

## Why Optimize Deployment Size?

- **Faster builds**: Smaller projects build faster on Vercel
- **Improved deployment reliability**: Less likely to hit size limits
- **Better performance**: Smaller assets load faster for users
- **Lower costs**: Some Vercel plans charge based on usage

## Available Scripts

We've added several utility scripts to help manage deployment size:

```bash
# Find duplicate files
npm run find:duplicates

# Optimize images (requires sharp)
npm run optimize:images

# Clean up unnecessary files for deployment
npm run cleanup:vercel

# Clear Next.js cache
npm run cleanup:cache

# Build with optimizations
npm run build:optimized

# Prepare for Vercel deployment (recommended)
npm run prepare:vercel
```

The `prepare:vercel` script is the recommended way to prepare for deployment as it:
1. Checks for compatibility issues with Vercel
2. Automatically fixes known configuration problems
3. Runs optimization scripts in the correct order
4. Cleans the cache and unnecessary files

## Deployment Best Practices

1. **Run the prepare:vercel script before deployment**
   ```bash
   npm run prepare:vercel
   ```
   This will automatically fix common issues and optimize your deployment.

2. **Optimize your images**
   - Use WebP or AVIF formats where possible
   - Resize images to the dimensions they'll be displayed at
   - Compress images appropriately without losing quality
   - Consider using a CDN for larger assets

3. **Remove duplicate files**
   - Run `npm run find:duplicates` to identify duplicates
   - Consolidate duplicate images, icons, and other assets
   - Use consistent paths for assets across your application

4. **Use a .vercelignore file**
   - Exclude development files, tests, and documentation
   - Skip large assets that aren't needed for production
   - See our sample .vercelignore file for reference

5. **Optimize Next.js for production**
   - Disable source maps in production
   - Configure image optimization settings
   - Set up proper webpack optimization
   - Remove console logs in production

6. **Clean cache before deployment**
   - Run `npm run cleanup:cache` before building
   - This removes Next.js build cache that may cause issues

## Regular Maintenance Tasks

1. **Monitor deployment size**
   - Check deployment size after each deployment
   - Investigate if size increases significantly

2. **Run optimization before major releases**
   ```bash
   npm run prepare:vercel
   ```

3. **Regular image audits**
   - Review all images quarterly
   - Replace large images with optimized versions
   - Consider using next/image for automatic optimization

4. **Add new assets carefully**
   - Optimize new images before adding
   - Don't commit unnecessary large files
   - Use public/images directory for app images

## Monitoring Deployment Size

1. **Check Vercel deployment logs**
   - Vercel shows the total size of your deployment
   - Note any significant changes between deployments

2. **Use analyze tools**
   ```bash
   npm run analyze
   ```
   This creates visualizations of your bundle size.

3. **Track metrics over time**
   - Keep a log of deployment sizes
   - Set size budgets for your project

## When Adding New Assets

1. **Optimize before adding**
   - Compress and resize images
   - Convert to efficient formats (WebP, AVIF)
   - Use the optimizing scripts

2. **Choose the right location**
   - Use public/images for static images
   - Use app/assets for component-specific images

3. **Consider alternatives**
   - Can the asset be loaded from a CDN?
   - Is a vector format (SVG) more appropriate?
   - Could you use CSS instead of an image?

## Troubleshooting Large Deployments

If your deployment is too large:

1. **Use the analyze script**
   ```bash
   npm run analyze
   ```
   This will show you what's taking up space in your build.

2. **Check for large dependencies**
   - Look for dependencies with many unnecessary files
   - Consider alternatives for bulky libraries
   - Use dynamic imports for code splitting

3. **Check for cached or redundant files**
   - Run cleanup scripts
   - Check .vercelignore is working correctly

4. **Use Vercel's built-in analytics**
   - Review size metrics in Vercel dashboard
   - Look for optimization opportunities 