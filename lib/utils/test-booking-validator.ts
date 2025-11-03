import { isDateInFuture, getCurrentIST, formatIST } from './time-formatter';
import { BookingValidationError, BookingValidationResult, BookingDates } from './booking-validator';

/**
 * Modified version of validateBookingDates that allows past bookings for testing
 */
export function validateBookingDatesForTesting(booking: BookingDates): BookingValidationResult {
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
    
    // Check if dropoff is after pickup (only validation we're keeping)
    if (dropoffDate <= pickupDate) {
      errors.push({
        code: BookingValidationError.DROPOFF_BEFORE_PICKUP,
        message: 'Dropoff time must be after pickup time'
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
    
    return {
      isValid: errors.length === 0,
      errors
    };
    
  } catch (error) {
    console.error('Error validating booking dates:', error);
    return {
      isValid: false,
      errors: [{
        code: BookingValidationError.INVALID_DATES,
        message: 'An error occurred while validating dates'
      }]
    };
  }
}
