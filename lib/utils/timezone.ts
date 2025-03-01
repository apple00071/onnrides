import { format, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import logger from '../logger';

/**
 * Constants for timezone operations
 */
export const IST_TIMEZONE = 'Asia/Kolkata';
export const UTC_TIMEZONE = 'UTC';
export const IST_OFFSET = '+05:30'; // IST is UTC+5:30

/**
 * Convert any date to IST timezone
 * @param date Date object or string to convert
 * @returns Date object in IST timezone
 */
export function toIST(date: Date | string | null): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = new Date(date);
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to toIST', { date });
      return null;
    }
    
    // No need to do timezone conversion on Date objects as they're always in UTC internally
    // Just return the date object which can be formatted appropriately later
    return dateObj;
  } catch (error) {
    logger.error('Error converting date to IST', { date, error });
    return null;
  }
}

/**
 * Convert IST date to UTC
 * @param date Date object or string in IST
 * @returns Date object in UTC
 */
export function toUTC(date: Date | string | null): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to toUTC', { date });
      return null;
    }
    
    return dateObj;
  } catch (error) {
    logger.error('Error converting date to UTC', { date, error });
    return null;
  }
}

/**
 * Format a date to a standard datetime string in IST timezone
 * @param date Date to format
 * @returns Formatted date string in IST
 */
export function formatDateTimeIST(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to formatDateTimeIST', { date });
      return 'Invalid date';
    }
    
    // Format the date in IST timezone with a consistent format
    return dateObj.toLocaleString('en-IN', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    logger.error('Error formatting date to IST datetime', { date, error });
    return 'Error formatting date';
  }
}

/**
 * Format a date to a standard date-only string in IST timezone
 * @param date Date to format
 * @returns Formatted date string in IST
 */
export function formatDateIST(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to formatDateIST', { date });
      return 'Invalid date';
    }
    
    // Format the date in IST timezone with a consistent format
    return dateObj.toLocaleString('en-IN', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    logger.error('Error formatting date to IST date', { date, error });
    return 'Error formatting date';
  }
}

/**
 * Format a date to a standard time-only string in IST timezone
 * @param date Date to format
 * @returns Formatted time string in IST
 */
export function formatTimeIST(date: Date | string | null): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to formatTimeIST', { date });
      return 'Invalid time';
    }
    
    // Format the time in IST timezone with a consistent format
    return dateObj.toLocaleString('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    logger.error('Error formatting date to IST time', { date, error });
    return 'Error formatting time';
  }
}

/**
 * Format a date to ISO8601 format with IST timezone indicator
 * Useful for APIs and database storage
 * @param date Date to format
 * @returns ISO-formatted date string with timezone
 */
export function formatISOWithTZ(date: Date | string | null): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to formatISOWithTZ', { date });
      return '';
    }
    
    // Generate ISO string with explicit timezone
    // Format: YYYY-MM-DDTHH:mm:ss+05:30
    const isoStr = dateObj.toISOString().slice(0, 19);
    return `${isoStr}${IST_OFFSET}`;
  } catch (error) {
    logger.error('Error formatting date to ISO with TZ', { date, error });
    return '';
  }
}

/**
 * Check if a date falls on a weekend in IST timezone
 * @param date Date to check
 * @returns Boolean indicating if the date is a weekend
 */
export function isWeekendIST(date: Date | string | null): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if valid date
    if (isNaN(dateObj.getTime())) {
      logger.warn('Invalid date provided to isWeekendIST', { date });
      return false;
    }
    
    // Get day of week in IST timezone
    const istDate = new Date(dateObj.toLocaleString('en-US', { timeZone: IST_TIMEZONE }));
    const dayOfWeek = istDate.getDay();
    
    // In JS, 0 is Sunday and 6 is Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
  } catch (error) {
    logger.error('Error checking if date is weekend in IST', { date, error });
    return false;
  }
}

/**
 * Get the current date and time in IST timezone
 * @returns Current date in IST
 */
export function getNowIST(): Date {
  return new Date();
}

/**
 * Get current date in ISO format with IST timezone
 * @returns Current date as ISO string with IST timezone
 */
export function getNowISTString(): string {
  return formatISOWithTZ(new Date());
} 