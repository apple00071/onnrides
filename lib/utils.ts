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
