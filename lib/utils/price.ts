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

  const durationDays = duration / 24;

  // 1. Long-Term Milestone Overrides (Based on 30-day Daily Rate)
  const dailyRate30 = price30Days ? (price30Days / 30) : (hourlyRate * 24);

  if (durationDays >= 60) {
    // 60+ Days: (30-day Rate - 100)
    return Math.round(durationDays * (dailyRate30 - 100));
  }

  if (durationDays >= 45) {
    // 45 - 59.99 Days: (30-day Rate - 50)
    return Math.round(durationDays * (dailyRate30 - 50));
  }

  // 2. Standard Range-based Per-Day Pricing

  if (durationDays >= 25 && price30Days) {
    // 25 - 44.99 days -> use 30-day rate
    return Math.round(durationDays * dailyRate30);
  }

  if (durationDays >= 15 && price15Days) {
    // 15 - 24.99 days -> (price_15_days / 15) * actual_days
    const dailyRate15 = price15Days / 15;
    return Math.round(durationDays * dailyRate15);
  }

  if (durationDays >= 7 && price7Days) {
    // 7 - 14.99 days -> (price_7_days / 7) * actual_days
    const dailyRate7 = (price7Days as number) / 7;
    return Math.round(durationDays * dailyRate7);
  }

  // 3. Fallback to hourly/weekend logic for < 7 days
  if (isWeekend) {
    // Weekend bookings always charge for 24 hours minimum
    return Math.round(Math.max(24, duration) * hourlyRate);
  } else {
    // Weekday bookings
    if (duration <= 12) {
      // For durations up to 12 hours, charge for full 12 hours
      return Math.round(12 * hourlyRate);
    } else {
      // For durations over 12 hours, charge for actual hours
      return Math.round(duration * hourlyRate);
    }
  }
}
