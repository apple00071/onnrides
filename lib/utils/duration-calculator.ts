import { differenceInHours, differenceInMinutes } from 'date-fns';

/**
 * Calculates the duration between two dates in hours
 * @param startDate Start date
 * @param endDate End date
 * @returns Duration in hours (can be decimal)
 */
export function calculateDuration(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const hours = differenceInHours(end, start);
  const remainingMinutes = differenceInMinutes(end, start) % 60;
  
  return hours + (remainingMinutes / 60);
} 