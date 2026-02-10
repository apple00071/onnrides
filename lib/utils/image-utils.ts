import logger from '@/lib/logger';
import { parseImages } from './data-normalization';

// Default placeholder as data URL to avoid missing file errors
export const DEFAULT_VEHICLE_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20"%3EVehicle Image%3C/text%3E%3C/svg%3E';
export const DEFAULT_PROFILE_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e0e0e0" width="200" height="200"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16"%3EProfile%3C/text%3E%3C/svg%3E';

// Image cache for faster subsequent loads
const imageCache = new Map<string, string>();

/**
 * Check if a string is a valid data URL
 * @param url URL string to check
 * @returns boolean indicating if the string is a valid data URL
 */
export const isValidDataUrl = (url: string): boolean => {
  return url.startsWith('data:image/');
};

/**
 * Check if a string is a valid URL (HTTP, HTTPS, or relative path)
 * @param url URL string to check
 * @returns boolean indicating if the string is a valid URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    if (url.startsWith('/')) return true;
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extract the first valid image URL from a vehicle object
 * @param images Image or images to process (string, array, or JSON string)
 * @returns The first valid image URL or an empty string if none found
 */
export const extractVehicleImage = (images: any): string => {
  const parsed = parseImages(images);
  if (!parsed || parsed.length === 0) return DEFAULT_VEHICLE_IMAGE;
  return parsed[0];
};

/**
 * Preload an image using the browser's Image constructor
 * @param url Image URL to preload
 * @returns Promise that resolves with success or rejects with error
 */
export const preloadImage = async (url: string): Promise<string> => {
  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Cache the successful URL
      imageCache.set(url, url);
      resolve(url);
    };

    img.onerror = () => {
      // Cache the default image for failed URLs
      imageCache.set(url, DEFAULT_VEHICLE_IMAGE);
      reject(new Error(`Failed to load image: ${url}`));
    };

    // Start loading with a timeout
    img.src = url;

    // Set a timeout for loading
    setTimeout(() => {
      img.src = '';
      imageCache.set(url, DEFAULT_VEHICLE_IMAGE);
      reject(new Error('Image loading timeout'));
    }, 5000); // 5 second timeout
  });
};

/**
 * Get a valid image URL with fallback
 * @param images Image or images to process (string, array, or JSON string)
 * @returns Valid image URL or fallback
 */
export const getValidImageUrl = (images: any): string => {
  const parsedImages = parseImages(images);

  if (parsedImages.length === 0) return DEFAULT_VEHICLE_IMAGE;

  const firstImage = parsedImages[0];

  if (imageCache.has(firstImage)) {
    return imageCache.get(firstImage)!;
  }

  if (isValidDataUrl(firstImage)) return firstImage;

  // If it's a relative path starting with /
  if (firstImage.startsWith('/')) return firstImage;

  if (isValidUrl(firstImage)) return firstImage;

  return DEFAULT_VEHICLE_IMAGE;
};

// Clear cache when it gets too large
export const clearImageCache = () => {
  if (imageCache.size > 100) { // Adjust size limit as needed
    imageCache.clear();
  }
};

// Preload multiple images in parallel
export const preloadImages = async (urls: string[]): Promise<void> => {
  try {
    await Promise.all(
      urls.map(url => preloadImage(url).catch(() => DEFAULT_VEHICLE_IMAGE))
    );
  } catch (error) {
    console.error('Error preloading images:', error);
  }
};