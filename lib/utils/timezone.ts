import { format, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Convert a UTC date to IST
 */
export function toIST(date: Date | string): Date {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  return utcToZonedTime(utcDate, IST_TIMEZONE);
}

/**
 * Convert an IST date to UTC
 */
export function toUTC(date: Date | string): Date {
  const localDate = typeof date === 'string' ? new Date(date) : date;
  return zonedTimeToUtc(localDate, IST_TIMEZONE);
}

/**
 * Format a date in IST with time
 */
export function formatDateTimeIST(date: Date | string): string {
  const istDate = toIST(date);
  return format(istDate, 'dd MMM yyyy, hh:mm a');
}

/**
 * Format a date in IST (date only)
 */
export function formatDateIST(date: Date | string): string {
  const istDate = toIST(date);
  return format(istDate, 'dd MMM yyyy');
}

/**
 * Format time in IST
 */
export function formatTimeIST(date: Date | string): string {
  const istDate = toIST(date);
  return format(istDate, 'hh:mm a');
}

/**
 * Format date in ISO string with IST timezone
 */
export function formatISOWithTZ(date: Date | string): string {
  const istDate = toIST(date);
  return formatISO(istDate, { representation: 'complete' });
}

/**
 * Check if a given date is a weekend in IST
 */
export function isWeekendIST(date: Date | string): boolean {
  const istDate = toIST(date);
  const day = istDate.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
} 