import { Vehicle } from '@/app/(main)/vehicles/types';

/**
 * Calculate the total price for a vehicle rental based on duration
 * @param vehicle The vehicle details including pricing
 * @param durationHours The total duration in hours
 * @returns The total price for the rental period
 */
export function calculateRentalPrice(vehicle: Vehicle, durationHours: number): number {
  const durationDays = durationHours / 24;

  // If duration is 30 days or more and 30-day price is set
  if (durationDays >= 30 && vehicle.price_30_days && vehicle.price_30_days > 0) {
    const fullMonths = Math.floor(durationDays / 30);
    const remainingDays = durationDays % 30;
    return (fullMonths * vehicle.price_30_days) + 
           (remainingDays * 24 * vehicle.price_per_hour);
  }

  // If duration is 15 days or more and 15-day price is set
  if (durationDays >= 15 && vehicle.price_15_days && vehicle.price_15_days > 0) {
    const full15Days = Math.floor(durationDays / 15);
    const remainingDays = durationDays % 15;
    return (full15Days * vehicle.price_15_days) + 
           (remainingDays * 24 * vehicle.price_per_hour);
  }

  // If duration is 7 days or more and 7-day price is set
  if (durationDays >= 7 && vehicle.price_7_days && vehicle.price_7_days > 0) {
    const fullWeeks = Math.floor(durationDays / 7);
    const remainingDays = durationDays % 7;
    return (fullWeeks * vehicle.price_7_days) + 
           (remainingDays * 24 * vehicle.price_per_hour);
  }

  // Default hourly pricing
  return durationHours * vehicle.price_per_hour;
} 