import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Suppress React hydration errors and log them instead
 * Use this function for non-critical UI elements where hydration mismatches are expected
 */
export const suppressHydrationWarning = () => ({
  suppressHydrationWarning: true,
});

/**
 * Format a date string or Date object into a localized string in IST
 * @param date Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY h:mm a format
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
