import { Vehicle } from '@/app/(main)/vehicles/types';
import { isWeekendIST } from './timezone';

export { isWeekendIST };

interface RentalPricing {
  price_per_hour: number;
  price_7_days?: number | null;
  price_15_days?: number | null;
  price_30_days?: number | null;
}

/**
 * Calculate the total price for a vehicle rental based on duration
 * @param pricing The vehicle pricing details
 * @param durationHours The total duration in hours
 * @param isWeekend Whether the booking starts on a weekend
 * @returns The total price for the rental period
 */
export function calculateRentalPrice(pricing: RentalPricing, durationHours: number, isWeekend: boolean): number {
  // Validate inputs to prevent NaN results
  const hourlyRate = typeof pricing.price_per_hour === 'number' && !isNaN(pricing.price_per_hour) 
    ? pricing.price_per_hour 
    : 0;
  
  const price7Days = typeof pricing.price_7_days === 'number' && !isNaN(pricing.price_7_days) && pricing.price_7_days > 0
    ? pricing.price_7_days
    : null;
    
  const price15Days = typeof pricing.price_15_days === 'number' && !isNaN(pricing.price_15_days) && pricing.price_15_days > 0
    ? pricing.price_15_days
    : null;
    
  const price30Days = typeof pricing.price_30_days === 'number' && !isNaN(pricing.price_30_days) && pricing.price_30_days > 0
    ? pricing.price_30_days
    : null;
  
  // Ensure duration is a valid number
  const duration = typeof durationHours === 'number' && !isNaN(durationHours) && durationHours > 0
    ? durationHours
    : 1; // Default to 1 hour if invalid
  
  // First check for special duration pricing
  const durationDays = duration / 24;

  // If duration is 30 days or more and 30-day price is set
  if (durationDays >= 30 && price30Days) {
    // For durations close to 30 days, use the 30-day price
    if (durationDays <= 31) {
      return price30Days;
    }
    const fullMonths = Math.floor(durationDays / 30);
    const remainingDays = durationDays % 30;
    return (fullMonths * price30Days) + 
           calculateRentalPrice(pricing, remainingDays * 24, isWeekend);
  }

  // If duration is 15 days or more and 15-day price is set
  if (durationDays >= 15 && price15Days) {
    // For durations close to 15 days, use the 15-day price
    if (durationDays <= 16) {
      return price15Days;
    }
    const full15Days = Math.floor(durationDays / 15);
    const remainingDays = durationDays % 15;
    return (full15Days * price15Days) + 
           calculateRentalPrice(pricing, remainingDays * 24, isWeekend);
  }

  // If duration is 7 days or more and 7-day price is set
  if (durationDays >= 7 && price7Days) {
    // For durations close to 7 days, use the 7-day price
    if (durationDays <= 8) {
      return price7Days;
    }
    const fullWeeks = Math.floor(durationDays / 7);
    const remainingDays = durationDays % 7;
    return (fullWeeks * price7Days) + 
           calculateRentalPrice(pricing, remainingDays * 24, isWeekend);
  }

  // Handle weekend and weekday pricing
  if (isWeekend) {
    // Weekend bookings always charge for 24 hours minimum
    return Math.max(24, duration) * hourlyRate;
  } else {
    // Weekday bookings
    if (duration <= 12) {
      // For durations up to 12 hours, charge for full 12 hours
      return 12 * hourlyRate;
    } else {
      // For durations over 12 hours, charge for actual hours
      return duration * hourlyRate;
    }
  }
} 