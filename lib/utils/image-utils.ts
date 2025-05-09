import logger from '@/lib/logger';
import { toast } from 'sonner';

// Default placeholder image paths
export const DEFAULT_VEHICLE_IMAGE = '/images/placeholder-vehicle.png';
export const DEFAULT_PROFILE_IMAGE = '/images/default-profile.png';

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
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extract the first valid image URL from a vehicle object
 * @param vehicle Vehicle object which may contain image data in various formats
 * @returns The first valid image URL or an empty string if none found
 */
export const extractVehicleImage = (images: string[] | undefined): string => {
  if (!images || images.length === 0) return DEFAULT_VEHICLE_IMAGE;
  return images[0];
};

/**
 * Preload an image using the browser's Image constructor
 * @param src Image URL to preload
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
 * @param fallback Fallback image to use if no valid image is found
 * @returns Valid image URL or fallback
 */
export const getValidImageUrl = (images: string[] | undefined): string => {
  if (!images || images.length === 0) return DEFAULT_VEHICLE_IMAGE;

  // Check cache first
  const firstImage = images[0];
  if (imageCache.has(firstImage)) {
    return imageCache.get(firstImage)!;
  }

  if (isValidDataUrl(firstImage)) return firstImage;
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