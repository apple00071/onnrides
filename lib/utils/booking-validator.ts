import { isDateInFuture, formatIST } from './time-formatter';
import logger from '../../lib/logger';

// Helper function to ensure consistent date comparison in IST
export function toIST(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

/**
 * Error types for booking validation
 */
export enum BookingValidationError {
  PAST_PICKUP_TIME = 'PAST_PICKUP_TIME',
  PAST_DROPOFF_TIME = 'PAST_DROPOFF_TIME',
  DROPOFF_BEFORE_PICKUP = 'DROPOFF_BEFORE_PICKUP',
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_DATES = 'INVALID_DATES',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
}

/**
 * Interface for booking validation result
 */
export interface BookingValidationResult {
  isValid: boolean;
  errors: {
    code: BookingValidationError;
    message: string;
  }[];
}

/**
 * Interface for booking dates
 */
export interface BookingDates {
  pickupDate: Date | string;
  dropoffDate: Date | string;
}

/**
 * Validates booking dates to ensure they are valid and in the future
 * @param booking The booking dates to validate
 * @returns Validation result with any errors
 */
export function validateBookingDates(booking: BookingDates): BookingValidationResult {
  const errors = [];
  
  // Check if required fields are present
  if (!booking.pickupDate || !booking.dropoffDate) {
    errors.push({
      code: BookingValidationError.MISSING_REQUIRED_FIELDS,
      message: 'Pickup and dropoff dates are required'
    });
    return { isValid: false, errors };
  }
  
  try {
    // Convert dates to Date objects if they're strings
    const pickupDate = typeof booking.pickupDate === 'string' 
      ? new Date(booking.pickupDate) 
      : booking.pickupDate;
    
    const dropoffDate = typeof booking.dropoffDate === 'string' 
      ? new Date(booking.dropoffDate) 
      : booking.dropoffDate;
    
    // Check if dates are valid
    if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
      errors.push({
        code: BookingValidationError.INVALID_DATES,
        message: 'Invalid date format'
      });
      return { isValid: false, errors };
    }
    
    // Convert dates to Date objects if they're strings
    const pickup = typeof pickupDate === 'string' ? new Date(pickupDate) : pickupDate;
    const dropoff = typeof dropoffDate === 'string' ? new Date(dropoffDate) : dropoffDate;
    const now = new Date();
    
    // Log the dates for debugging
    logger.info('Validating booking dates', {
      pickup: { raw: pickupDate, parsed: pickup, ist: toIST(pickup) },
      dropoff: { raw: dropoffDate, parsed: dropoff, ist: toIST(dropoff) },
      now: { utc: now, ist: toIST(now) }
    });

    // Check if pickup date is in the future (in IST)
    if (toIST(pickup) <= toIST(now)) {
      errors.push({
        code: BookingValidationError.PAST_PICKUP_TIME,
        message: `Pickup time must be in the future. Selected: ${formatIST(pickup)}, Current time: ${formatIST(now)}`
      });
    }
    
    // Check if dropoff date is after pickup (in IST)
    if (toIST(dropoff) <= toIST(pickup)) {
      errors.push({
        code: BookingValidationError.DROPOFF_BEFORE_PICKUP,
        message: `Dropoff time must be after pickup time. Pickup: ${formatIST(pickup)}, Dropoff: ${formatIST(dropoff)}`
      });
    }
    
    // Check if duration is valid (at least 1 hour)
    const durationMs = dropoffDate.getTime() - pickupDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    if (durationHours < 1) {
      errors.push({
        code: BookingValidationError.INVALID_DURATION,
        message: 'Booking duration must be at least 1 hour'
      });
    }
    
  } catch (error) {
    logger.error('Error validating booking dates:', error);
    errors.push({
      code: BookingValidationError.INVALID_DATES,
      message: 'Error validating dates'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculates the duration of a booking in hours
 * @param booking The booking dates
 * @returns Duration in hours or null if dates are invalid
 */
export function calculateBookingDuration(booking: BookingDates): number | null {
  try {
    // Convert dates to Date objects if they're strings
    const pickupDate = typeof booking.pickupDate === 'string' 
      ? new Date(booking.pickupDate) 
      : booking.pickupDate;
    
    const dropoffDate = typeof booking.dropoffDate === 'string' 
      ? new Date(booking.dropoffDate) 
      : booking.dropoffDate;
    
    // Check if dates are valid
    if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
      return null;
    }
    
    // Calculate duration in hours
    const durationMs = dropoffDate.getTime() - pickupDate.getTime();
    return durationMs / (1000 * 60 * 60);
  } catch (error) {
    logger.error('Error calculating booking duration:', error);
    return null;
  }
} 