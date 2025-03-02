import { Pool } from 'pg';
import logger from '@/lib/logger';

/**
 * Configure timezone settings globally for the application
 * This ensures consistent timezone handling across all components
 */
export async function configureGlobalTimezone() {
  try {
    // Set Node.js process timezone (only affects some date functions)
    process.env.TZ = 'Asia/Kolkata';
    
    // Log timezone configuration
    logger.info('Timezone configuration initialized', {
      processTimezone: process.env.TZ,
      nodeDateString: new Date().toString(),
      nodeISOString: new Date().toISOString(),
      nodeLocaleString: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });

    return true;
  } catch (error) {
    logger.error('Failed to configure global timezone:', error);
    return false;
  }
}

/**
 * Configure database connection pool to use IST timezone by default
 * @param pool - PostgreSQL connection pool
 */
export async function configureDatabaseTimezone(pool: Pool) {
  try {
    // Set the timezone for all connections in this pool
    await pool.query(`SET timezone = 'Asia/Kolkata'`);
    
    // Verify timezone setting
    const result = await pool.query(`SHOW timezone`);
    const timezone = result.rows[0].timezone;
    
    logger.info('Database timezone configured:', { timezone });
    
    // For verification, get current time from database
    const timeResult = await pool.query(`SELECT NOW() AS server_time`);
    logger.info('Database server time:', { 
      serverTime: timeResult.rows[0].server_time,
      nodeTime: new Date()
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to configure database timezone:', error);
    return false;
  }
}

/**
 * Apply consistent date handling to query results
 * Converts date fields from UTC to IST
 * @param rows - Query result rows
 * @param dateFields - Array of field names that contain dates
 * @returns The rows with converted date fields
 */
export function convertDatesInQueryResults<T extends Record<string, any>>(
  rows: T[],
  dateFields: string[]
): Array<T & Record<string, string>> {
  return rows.map(row => {
    // Create a copy that allows additional properties
    const convertedRow: Record<string, any> = { ...row };
    
    for (const field of dateFields) {
      if (row[field] instanceof Date || typeof row[field] === 'string') {
        // Convert to IST
        try {
          const date = new Date(row[field]);
          // Only process valid dates
          if (!isNaN(date.getTime())) {
            // Add formatted date fields
            const fieldName = field.replace(/(_date|_datetime|_time)$/, '');
            convertedRow[`formatted_${fieldName}`] = formatDateTimeIST(date);
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    }
    
    return convertedRow as T & Record<string, string>;
  });
}

/**
 * Format a date to a standard datetime string in IST timezone
 * @param date - Date to format
 * @returns Formatted date string in IST timezone
 */
export function formatDateTimeIST(date: Date | string | null): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Format the date in IST timezone
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
    logger.error('Error formatting date to IST:', { date, error });
    return '';
  }
} 