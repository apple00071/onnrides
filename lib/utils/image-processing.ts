/**
 * Client-side image processing utility
 * Automatically crops whitespace from images using Canvas API
 */

export interface ProcessedImage {
    dataUrl: string;
    width: number;
    height: number;
    originalSize: number;
    processedSize: number;
}

/**
 * Detects if a pixel is considered "background" (white or transparent)
 */
function isBackgroundPixel(data: Uint8ClampedArray, idx: number, threshold: number = 250): boolean {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // Transparent pixel
    if (a < 10) return true;

    // White/near-white pixel
    if (r > threshold && g > threshold && b > threshold) return true;

    return false;
}

/**
 * Finds the content boundaries (non-background pixels)
 */
function findContentBounds(
    imageData: ImageData
): { top: number; bottom: number; left: number; right: number } {
    const { data, width, height } = imageData;
    let top = height;
    let bottom = 0;
    let left = width;
    let right = 0;

    // Scan all pixels to find content boundaries
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            if (!isBackgroundPixel(data, idx)) {
                // Found a content pixel
                if (y < top) top = y;
                if (y > bottom) bottom = y;
                if (x < left) left = x;
                if (x > right) right = x;
            }
        }
    }

    // If no content found, return full image
    if (top > bottom || left > right) {
        return { top: 0, bottom: height - 1, left: 0, right: width - 1 };
    }

    return { top, bottom, left, right };
}

/**
 * Crops whitespace from an image file and resizes to consistent dimensions
 */
export async function processImage(file: File): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));

        img.onload = () => {
            try {
                // Create canvas to analyze the image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw original image
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Get image data and find content boundaries
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const bounds = findContentBounds(imageData);

                // Calculate cropped dimensions
                const croppedWidth = bounds.right - bounds.left + 1;
                const croppedHeight = bounds.bottom - bounds.top + 1;

                // Add small padding (5% of content size)
                const paddingX = Math.max(10, Math.floor(croppedWidth * 0.05));
                const paddingY = Math.max(10, Math.floor(croppedHeight * 0.05));

                const finalLeft = Math.max(0, bounds.left - paddingX);
                const finalTop = Math.max(0, bounds.top - paddingY);
                const finalWidth = Math.min(canvas.width - finalLeft, croppedWidth + paddingX * 2);
                const finalHeight = Math.min(canvas.height - finalTop, croppedHeight + paddingY * 2);

                // Create final canvas with consistent size
                const targetWidth = 800;
                const targetHeight = 600;

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = targetWidth;
                finalCanvas.height = targetHeight;
                const finalCtx = finalCanvas.getContext('2d');

                if (!finalCtx) {
                    reject(new Error('Failed to get final canvas context'));
                    return;
                }

                // Fill with transparent background
                finalCtx.clearRect(0, 0, targetWidth, targetHeight);

                // Calculate scaling to fit content within target size while maintaining aspect ratio
                const scale = Math.min(
                    targetWidth / finalWidth,
                    targetHeight / finalHeight
                );

                const scaledWidth = finalWidth * scale;
                const scaledHeight = finalHeight * scale;

                // Center the image
                const offsetX = (targetWidth - scaledWidth) / 2;
                const offsetY = (targetHeight - scaledHeight) / 2;

                // Draw cropped and scaled image
                finalCtx.drawImage(
                    img,
                    finalLeft,
                    finalTop,
                    finalWidth,
                    finalHeight,
                    offsetX,
                    offsetY,
                    scaledWidth,
                    scaledHeight
                );

                // Convert to data URL
                const dataUrl = finalCanvas.toDataURL('image/png', 0.95);

                resolve({
                    dataUrl,
                    width: targetWidth,
                    height: targetHeight,
                    originalSize: file.size,
                    processedSize: dataUrl.length
                });
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        reader.readAsDataURL(file);
    });
}
