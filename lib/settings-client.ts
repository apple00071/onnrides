/**
 * Client-side settings library
 * Uses API calls instead of direct database access
 */

// In-memory cache for settings
// This will reduce API calls for frequently accessed settings
type SettingsCache = {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
};

const cache: SettingsCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a setting value by key
 * @param key Setting key
 * @param defaultValue Default value if setting is not found
 * @param skipCache Whether to skip the cache and force API fetch
 * @returns The setting value or default value if not found
 */
export async function getSetting(
  key: string, 
  defaultValue: string = '', 
  skipCache: boolean = false
): Promise<string> {
  try {
    // Check cache first if not skipping it
    if (!skipCache && cache[key] && cache[key].expiresAt > Date.now()) {
      return cache[key].value;
    }

    // Fetch from API
    try {
      // First ensure the settings table exists
      await fetch('/api/settings/initialize');
      
      // Then fetch the specific setting
      const response = await fetch(`/api/settings?key=${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        return defaultValue;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Update cache
        cache[key] = {
          value: data.data.value,
          expiresAt: Date.now() + CACHE_TTL
        };
        return data.data.value;
      }
    } catch (error) {
      console.error('Error fetching setting:', key, error);
    }

    return defaultValue;
  } catch (error) {
    console.error('Error in getSetting:', key, error);
    return defaultValue;
  }
}

/**
 * Set a setting value
 * @param key Setting key
 * @param value Setting value
 * @returns True if setting was updated successfully, false otherwise
 */
export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    // Send to API
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update cache
      cache[key] = {
        value,
        expiresAt: Date.now() + CACHE_TTL
      };
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error setting value:', key, value, error);
    return false;
  }
}

/**
 * Get a boolean setting value
 * @param key Setting key
 * @param defaultValue Default value if setting is not found
 * @returns The setting value as boolean
 */
export async function getBooleanSetting(
  key: string, 
  defaultValue: boolean = false
): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue));
  return value.toLowerCase() === 'true';
}

/**
 * Get a numeric setting value
 * @param key Setting key
 * @param defaultValue Default value if setting is not found
 * @returns The setting value as number
 */
export async function getNumericSetting(
  key: string, 
  defaultValue: number = 0
): Promise<number> {
  const value = await getSetting(key, String(defaultValue));
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clear the settings cache
 */
export function clearSettingsCache(): void {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
}

// Common settings keys
export const SETTINGS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  SITE_NAME: 'site_name',
  SUPPORT_EMAIL: 'support_email',
  SUPPORT_PHONE: 'support_phone',
  BOOKING_ADVANCE_PAYMENT_PERCENTAGE: 'booking_advance_payment_percentage',
  BOOKING_GST_PERCENTAGE: 'booking_gst_percentage',
  BOOKING_SERVICE_FEE_PERCENTAGE: 'booking_service_fee_percentage',
  GST_ENABLED: 'gst_enabled'
}; 