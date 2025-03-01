import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseISO, format, isValid } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import logger from './logger';
import { toIST, formatDateTimeIST, formatDateIST, formatTimeIST } from './utils/timezone';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(price);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPhoneNumber(phone: string) {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function isValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function generateRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export type { ClassValue }

interface Vehicle {
  price_per_day: number;
  price_12hrs: number;
  price_24hrs: number;
  price_7days: number;
  price_15days: number;
  price_30days: number;
  min_booking_hours: number;
  price_per_hour: number;
}

export function calculateBookingPrice(
  vehicle: Vehicle,
  startDate: Date,
  endDate: Date
): number {
  // Handle invalid dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }

  // Calculate duration in hours
  const durationInHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  
  // Get the day of week for start date (0 = Sunday, 6 = Saturday)
  const startDay = startDate.getDay();
  
  // Check if it's a weekend (Saturday or Sunday)
  const isWeekend = startDay === 0 || startDay === 6;
  
  // Set minimum hours based on weekend/weekday
  const minimumHours = isWeekend ? 24 : 12;
  
  // Calculate billable hours (cannot be less than minimum hours)
  const billableHours = Math.max(minimumHours, durationInHours);
  
  // Calculate base price
  const basePrice = vehicle.price_per_hour * billableHours;
  
  // Return the calculated price
  return basePrice;
}

export function calculateDuration(startDate: Date, endDate: Date): number {
  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));
  return diffInHours;
}

export function calculateTotalPrice(startDate: Date, endDate: Date, pricePerHour: number): number {
  const duration = calculateDuration(startDate, endDate);
  return duration * pricePerHour;
}

/**
 * Default fetcher for SWR
 * @param url The URL to fetch from
 * @returns The parsed JSON response
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    const info = await res.json();
    (error as any).status = res.status;
    (error as any).info = info;
    throw error;
  }

  return res.json();
};

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDuration(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days > 0) {
    return `${days} ${days === 1 ? 'Day' : 'Days'}${remainingHours > 0 ? `, ${remainingHours} ${remainingHours === 1 ? 'Hour' : 'Hours'}` : ''}`;
  }
  return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
}

/**
 * Check if the current environment is serverless
 * This checks for common serverless environment indicators
 */
export function isServerless(): boolean {
  return (
    process.env.VERCEL === '1' ||  // Vercel
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||  // AWS Lambda
    process.env.FUNCTIONS_WORKER_RUNTIME !== undefined ||  // Azure Functions
    process.env.K_SERVICE !== undefined ||  // Google Cloud Functions
    process.env.NETLIFY === 'true' ||  // Netlify
    process.env.CLOUD_FUNCTION_NAME !== undefined  // Other cloud functions
  );
}

// Export timezone functions from the dedicated utils/timezone.ts file
export { toIST, formatDateTimeIST, formatDateIST, formatTimeIST } from './utils/timezone';

// Keep our new format function as a wrapper for consistency with existing code
// This will be used where we previously added formatDateToIST
export const formatDateToIST = (dateString: string | Date | null) => {
  if (!dateString) return 'N/A';
  try {
    return formatDateTimeIST(dateString);
  } catch (error) {
    logger.error('Error formatting date:', { dateString, error });
    return 'Invalid date';
  }
}; 