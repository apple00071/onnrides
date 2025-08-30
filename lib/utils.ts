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
 * Format a date string or Date object into a localized string
 * @param date Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
