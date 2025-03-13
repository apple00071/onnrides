#!/bin/bash
# Script to generate favicon files using ImageMagick
# Run with: bash scripts/generate-favicons.sh

# Set paths
SOURCE_LOGO="public/logo.png"
FAVICON_DIR="public/favicon"

# Create favicon directory if it doesn't exist
mkdir -p $FAVICON_DIR

# Generate various sizes
echo "Generating favicon files..."

# favicon-16x16.png
convert $SOURCE_LOGO -resize 16x16 $FAVICON_DIR/favicon-16x16.png
echo "Created favicon-16x16.png"

# favicon-32x32.png
convert $SOURCE_LOGO -resize 32x32 $FAVICON_DIR/favicon-32x32.png
echo "Created favicon-32x32.png"

# apple-touch-icon.png
convert $SOURCE_LOGO -resize 180x180 $FAVICON_DIR/apple-touch-icon.png
echo "Created apple-touch-icon.png"

# android-chrome-192x192.png
convert $SOURCE_LOGO -resize 192x192 $FAVICON_DIR/android-chrome-192x192.png
echo "Created android-chrome-192x192.png"

# android-chrome-512x512.png
convert $SOURCE_LOGO -resize 512x512 $FAVICON_DIR/android-chrome-512x512.png
echo "Created android-chrome-512x512.png"

# mstile-150x150.png
convert $SOURCE_LOGO -resize 150x150 $FAVICON_DIR/mstile-150x150.png
echo "Created mstile-150x150.png"

# favicon.ico (with multiple sizes)
convert $SOURCE_LOGO -resize 16x16 $SOURCE_LOGO -resize 32x32 $FAVICON_DIR/favicon.ico
echo "Created favicon.ico"

echo "Favicon generation complete!" 