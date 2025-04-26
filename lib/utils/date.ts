/**
 * Formats a date into a human-readable string in 12-hour format
 * Example: "Thu, Apr 24, 2025, 05:30 AM"
 * @param date - Date object or date string to format
 * @returns Formatted date string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided to formatDateTime:', date);
    return 'Invalid date';
  }

  return d.toLocaleString('en-US', {
    weekday: 'short', // Thu
    month: 'short',   // Apr
    day: 'numeric',   // 24
    year: 'numeric',  // 2025
    hour: '2-digit',  // 05
    minute: '2-digit',// 30
    hour12: true      // AM/PM
  });
}

/**
 * Formats a date into a short date string
 * Example: "24 Apr 2025"
 * @param date - Date object or date string to format
 * @returns Formatted date string
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided to formatShortDate:', date);
    return 'Invalid date';
  }

  return d.toLocaleString('en-US', {
    day: 'numeric',   // 24
    month: 'short',   // Apr
    year: 'numeric'   // 2025
  });
}

/**
 * Formats a time into a 12-hour format string
 * Example: "05:30 AM"
 * @param date - Date object or date string to format
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided to formatTime:', date);
    return 'Invalid time';
  }

  return d.toLocaleString('en-US', {
    hour: '2-digit',  // 05
    minute: '2-digit',// 30
    hour12: true      // AM/PM
  });
}

/**
 * Returns true if the date is in the past
 * @param date - Date object or date string to check
 * @returns boolean indicating if date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    console.error('Invalid date provided to isPastDate:', date);
    return false;
  }

  return d.getTime() < Date.now();
}

/**
 * Returns the difference between two dates in days
 * @param start - Start date
 * @param end - End date
 * @returns Number of days between dates
 */
export function getDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  // Handle invalid dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date(s) provided to getDaysBetween:', { start, end });
    return 0;
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the duration between two dates in hours
 * @param start - Start date
 * @param end - End date
 * @returns Number of hours between dates (rounded up to nearest hour)
 */
export function calculateDuration(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  
  // Handle invalid dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error('Invalid date(s) provided to calculateDuration:', { start, end });
    return 0;
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60)); // Convert milliseconds to hours and round up
} 