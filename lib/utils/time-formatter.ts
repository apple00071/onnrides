import { format, formatInTimeZone } from 'date-fns-tz';
import logger from '../../lib/logger';

// IST timezone string
const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Converts any date to IST timezone
 * @param date Date to convert (Date object or ISO string)
 * @returns Date object in IST timezone
 */
export function toIST(date: Date | string | null): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Date(formatInTimeZone(dateObj, IST_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"));
  } catch (error) {
    logger.error('Error converting date to IST:', error);
    return null;
  }
}

/**
 * Format a date to IST timezone with proper formatting
 * @param date Date to format
 * @returns Formatted date string in IST
 */
export function formatIST(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    logger.error('Error formatting date to IST:', error);
    return 'Error formatting date';
  }
}

/**
 * Formats a date to IST date only (DD MMM YYYY)
 * @param date Date to format
 * @returns Formatted date string in IST
 */
export function formatISTDateOnly(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const istDate = toIST(date);
    if (!istDate) return 'Invalid Date';
    return format(istDate, 'dd MMM yyyy', { timeZone: IST_TIMEZONE });
  } catch (error) {
    logger.error('Error formatting date to IST:', error);
    return 'Error formatting date';
  }
}

/**
 * Formats a date to IST time only (h:mm a)
 * @param date Date to format
 * @returns Formatted time string in IST
 */
export function formatISTTimeOnly(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const istDate = toIST(date);
    if (!istDate) return 'Invalid Date';
    return format(istDate, 'h:mm a', { timeZone: IST_TIMEZONE });
  } catch (error) {
    logger.error('Error formatting time to IST:', error);
    return 'Error formatting time';
  }
}

/**
 * Formats a date to IST date and time with seconds (DD MMM YYYY, h:mm:ss a)
 * @param date Date to format
 * @returns Formatted date string in IST with seconds
 */
export function formatISTWithSeconds(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const istDate = toIST(date);
    if (!istDate) return 'Invalid Date';
    return format(istDate, 'dd MMM yyyy, h:mm:ss a', { timeZone: IST_TIMEZONE });
  } catch (error) {
    logger.error('Error formatting date to IST with seconds:', error);
    return 'Error formatting date';
  }
}

/**
 * Validates that a date is in the future (in IST timezone)
 * @param date Date to validate
 * @returns Boolean indicating if date is in the future
 */
export function isDateInFuture(date: Date | string | null): boolean {
  if (!date) return false;
  
  try {
    const istDate = toIST(date);
    if (!istDate) return false;
    
    const now = toIST(new Date());
    if (!now) return false; // Handle the case where now could be null
    
    return istDate > now;
  } catch (error) {
    logger.error('Error checking if date is in future:', error);
    return false;
  }
}

/**
 * Gets the current date and time in IST
 * @returns Current date in IST timezone
 */
export function getCurrentIST(): Date {
  const now = toIST(new Date());
  if (!now) {
    // This should never happen with a valid new Date(), but handle it anyway
    logger.error('Failed to convert current time to IST');
    return new Date(); // Fallback to UTC date
  }
  return now;
}

/**
 * Format a date to a standard datetime string
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd MMM yyyy, h:mm a');
  } catch (error) {
    logger.error('Error formatting datetime:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date to date only string
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd MMM yyyy');
  } catch (error) {
    logger.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date to time only string
 */
export function formatTime(date: string | Date | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'h:mm a');
  } catch (error) {
    logger.error('Error formatting time:', error);
    return 'Invalid time';
  }
}

/**
 * Format a duration in hours to a readable string
 */
export function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (minutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export function formatISOWithTZ(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
} 