'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Date format types
export type DateFormat = 
  | 'full'       // e.g., "15 Jun 2023, 02:30 PM"
  | 'date'       // e.g., "15 Jun 2023"
  | 'time'       // e.g., "02:30 PM"
  | 'short'      // e.g., "15/06/23"
  | 'relative'   // e.g., "2 hours ago"
  | 'custom';    // Use custom format provided in formatString

interface FormattedDateProps {
  date: Date | string | number | null | undefined;
  format?: DateFormat;
  formatString?: string;
  fallback?: string;
  className?: string;
  showTimezone?: boolean; // Whether to show timezone (IST)
  includeSeconds?: boolean;
}

/**
 * FormattedDate component provides consistent date formatting across the application
 * Displays dates in Indian Standard Time (IST)
 */
export default function FormattedDate({
  date,
  format = 'full',
  formatString,
  fallback = 'N/A',
  className,
  showTimezone = false,
  includeSeconds = false,
}: FormattedDateProps) {
  // Early return for null/undefined dates
  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  try {
    // Convert the input to a Date object
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return <span className={className}>{fallback}</span>;
    }

    // Format options for different format types
    const getFormattedDate = () => {
      const timezoneSuffix = showTimezone ? ' (IST)' : '';
      
      switch (format) {
        case 'full':
          return dateObj.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: includeSeconds ? '2-digit' : undefined,
            hour12: true
          }) + timezoneSuffix;
          
        case 'date':
          return dateObj.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) + timezoneSuffix;
          
        case 'time':
          return dateObj.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: includeSeconds ? '2-digit' : undefined,
            hour12: true
          }) + timezoneSuffix;
          
        case 'short':
          return dateObj.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          }) + timezoneSuffix;
          
        case 'relative':
          const now = new Date();
          const diffMs = now.getTime() - dateObj.getTime();
          const diffSec = Math.floor(diffMs / 1000);
          const diffMin = Math.floor(diffSec / 60);
          const diffHour = Math.floor(diffMin / 60);
          const diffDay = Math.floor(diffHour / 24);
          
          if (diffSec < 60) return 'just now';
          if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
          if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
          if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
          
          // Fall back to date format for older dates
          return dateObj.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) + timezoneSuffix;
          
        case 'custom':
          if (!formatString) return dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + timezoneSuffix;
          
          // Very basic custom formatter - replace tokens with date parts
          let result = formatString;
          const parts = {
            'YYYY': dateObj.getFullYear(),
            'YY': String(dateObj.getFullYear()).slice(-2),
            'MM': String(dateObj.getMonth() + 1).padStart(2, '0'),
            'MMM': dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }),
            'DD': String(dateObj.getDate()).padStart(2, '0'),
            'HH': String(dateObj.getHours()).padStart(2, '0'),
            'hh': String(dateObj.getHours() > 12 ? dateObj.getHours() - 12 : dateObj.getHours()).padStart(2, '0'),
            'mm': String(dateObj.getMinutes()).padStart(2, '0'),
            'ss': String(dateObj.getSeconds()).padStart(2, '0'),
            'A': dateObj.getHours() >= 12 ? 'PM' : 'AM'
          };
          
          Object.entries(parts).forEach(([token, value]) => {
            result = result.replace(token, String(value));
          });
          
          return result + timezoneSuffix;
          
        default:
          return dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + timezoneSuffix;
      }
    };

    return (
      <time
        dateTime={dateObj.toISOString()}
        className={cn('whitespace-nowrap', className)}
      >
        {getFormattedDate()}
      </time>
    );
  } catch (error) {
    console.error('Error formatting date:', error);
    return <span className={className}>{fallback}</span>;
  }
}

/**
 * Usage examples:
 * 
 * <FormattedDate date={booking.pickup_datetime} format="full" />
 * <FormattedDate date={booking.created_at} format="relative" />
 * <FormattedDate date={booking.start_date} format="date" showTimezone />
 * <FormattedDate date={booking.payment_date} format="custom" formatString="DD/MM/YYYY hh:mm A" />
 */ 