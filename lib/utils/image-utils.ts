import logger from '@/lib/logger';

// Default placeholder image paths
export const DEFAULT_VEHICLE_IMAGE = '/images/placeholder-vehicle.png';
export const DEFAULT_PROFILE_IMAGE = '/images/default-profile.png';

/**
 * Check if a string is a valid data URL
 * @param url URL string to check
 * @returns boolean indicating if the string is a valid data URL
 */
export const isValidDataUrl = (url?: string): boolean => {
  return typeof url === 'string' && url.startsWith('data:image/');
};

/**
 * Check if a string is a valid URL (HTTP, HTTPS, or relative path)
 * @param url URL string to check
 * @returns boolean indicating if the string is a valid URL
 */
export const isValidUrl = (url?: string): boolean => {
  if (!url) return false;
  if (isValidDataUrl(url)) return true;
  try {
    return url.startsWith('http') || url.startsWith('/');
  } catch (e) {
    return false;
  }
};

/**
 * Extract the first valid image URL from a vehicle object
 * @param vehicle Vehicle object which may contain image data in various formats
 * @returns The first valid image URL or an empty string if none found
 */
export const extractVehicleImage = (vehicle: any): string => {
  if (!vehicle) {
    logger.error('No vehicle data provided to extractVehicleImage');
    return '';
  }
  
  // If vehicle is a string (possibly stringified JSON), try to parse it
  if (typeof vehicle === 'string') {
    try {
      const parsedVehicle = JSON.parse(vehicle);
      logger.info('Successfully parsed vehicle string to object', {
        parsedVehicleKeys: Object.keys(parsedVehicle)
      });
      // Recursively call with the parsed object
      return extractVehicleImage(parsedVehicle);
    } catch (e) {
      logger.error('Vehicle data is a string but not valid JSON', {
        vehicle: vehicle.substring(0, 150)
      });
      return '';
    }
  }
  
  // Direct image property - common case
  if (vehicle.image) {
    if (typeof vehicle.image === 'string') {
      // For direct string URLs
      if (isValidUrl(vehicle.image)) {
        return vehicle.image;
      }
    } else if (Array.isArray(vehicle.image) && vehicle.image.length > 0) {
      const firstImage = vehicle.image[0];
      if (typeof firstImage === 'string' && isValidUrl(firstImage)) {
        return firstImage;
      }
    }
  }
  
  // Try images property (plural) - sometimes used instead
  if (vehicle.images) {
    // If it's a string
    if (typeof vehicle.images === 'string') {
      // Direct URL
      if (isValidUrl(vehicle.images)) {
        return vehicle.images;
      }
      
      // Could be a JSON string
      try {
        const parsed = JSON.parse(vehicle.images);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstImage = parsed[0];
          if (typeof firstImage === 'string' && isValidUrl(firstImage)) {
            return firstImage;
          }
        }
      } catch (e) {
        // Not a valid JSON string - but could be a direct image URL
        if (vehicle.images.startsWith('http') || vehicle.images.startsWith('/')) {
          return vehicle.images;
        }
      }
    }
    
    // If it's an array
    if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
      const firstImage = vehicle.images[0];
      if (typeof firstImage === 'string' && isValidUrl(firstImage)) {
        return firstImage;
      }
    }
  }
  
  // If the vehicle data indicates it has an image (from hasImage property) but we couldn't find it,
  // try to access any property that might hold the image
  if (vehicle.hasImage === true || vehicle.has_image === true) {
    // Check specific properties that might contain image URLs
    if (vehicle.image_url && isValidUrl(vehicle.image_url)) {
      return vehicle.image_url;
    }
    
    if (vehicle.imageUrl && isValidUrl(vehicle.imageUrl)) {
      return vehicle.imageUrl;
    }
    
    if (vehicle.url && isValidUrl(vehicle.url)) {
      return vehicle.url;
    }
    
    // Check all properties in the object for potential image URLs
    for (const key in vehicle) {
      const value = vehicle[key];
      if (typeof value === 'string' && isValidUrl(value)) {
        // Skip obvious non-image URLs
        if (key !== 'id' && key !== 'name' && key !== 'type' && !key.includes('time') && !key.includes('date')) {
          return value;
        }
      }
    }
  }
  
  // If we still can't find an image, return empty string
  return '';
};

/**
 * Preload an image using the browser's Image constructor
 * @param src Image URL to preload
 * @returns Promise that resolves with success or rejects with error
 */
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (!src || !isValidUrl(src) || isValidDataUrl(src)) {
      // Don't try to preload data URLs or invalid URLs
      reject(new Error('Invalid URL or data URL provided'));
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('Cannot preload image on server side'));
      return;
    }

    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Get a valid image URL with fallback
 * @param images Image or images to process (string, array, or JSON string)
 * @param fallback Fallback image to use if no valid image is found
 * @returns Valid image URL or fallback
 */
export const getValidImageUrl = (images: any, fallback: string = DEFAULT_VEHICLE_IMAGE): string => {
  // Handle undefined/null case
  if (!images) {
    return fallback;
  }

  // If images is a string, try to parse it as JSON
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      images = parsed;
    } catch (e) {
      // If parsing fails and it's a valid URL, use it directly
      if (images.trim() && isValidUrl(images)) {
        return images;
      }
      return fallback;
    }
  }

  // Ensure images is an array
  if (!Array.isArray(images)) {
    return fallback;
  }

  // Find first valid image URL
  const validImage = images.find(img => {
    if (!img || typeof img !== 'string') return false;
    const url = img.trim();
    return url.length > 0 && isValidUrl(url);
  });

  return validImage || fallback;
}; 