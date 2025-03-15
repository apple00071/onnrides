import { customAlphabet } from 'nanoid';
import logger from '../../lib/logger';

// Define constants for booking ID generation
const BOOKING_PREFIX = 'OR';

// Create a custom nanoid generator with only uppercase alphanumeric characters
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 3);

/**
 * Generates a consistent booking ID format
 * Format: OR + 3 alphanumeric characters (e.g., OR735)
 * 
 * @param vehicleType The type of vehicle (not used in this implementation to match original format)
 * @returns A unique booking ID
 */
export function generateBookingId(vehicleType?: string): string {
  try {
    // Generate random part (3 characters)
    const randomPart = nanoid();
    
    // Combine parts
    return `${BOOKING_PREFIX}${randomPart}`;
  } catch (error) {
    logger.error('Error generating booking ID:', error);
    // Fallback to the original method if there's an error
    return 'OR' + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
}

/**
 * Validates if a string is a valid booking ID
 * @param bookingId The booking ID to validate
 * @returns Boolean indicating if the booking ID is valid
 */
export function isValidBookingId(bookingId: string): boolean {
  if (!bookingId) return false;
  
  // Check if it starts with the prefix and has the correct length
  if (!bookingId.startsWith(BOOKING_PREFIX)) return false;
  
  // Should be prefix (2 chars) + 3 random chars = 5 chars total
  return bookingId.length === 5;
}

/**
 * Extracts the vehicle type from a booking ID
 * This function is kept for API compatibility but returns undefined since
 * the original booking ID format doesn't encode vehicle type.
 * 
 * @param bookingId The booking ID
 * @returns Always undefined since original format doesn't encode vehicle type
 */
export function getVehicleTypeFromBookingId(bookingId: string): string | undefined {
  return undefined; // Original format doesn't encode vehicle type
}

/**
 * Formats a booking ID for display
 * This function is kept for API compatibility but just returns the original ID
 * since no special formatting is needed.
 * 
 * @param bookingId The booking ID to format
 * @returns The original booking ID
 */
export function formatBookingId(bookingId: string): string {
  return bookingId || '';
} 