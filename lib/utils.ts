import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

  const durationInHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  const perHourRate = Number(vehicle.price_per_day); // Get per-hour rate from vehicle data
  const startDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  
  // Check if it's a weekday (Mon-Wed) or weekend (Thu-Sun)
  const isWeekend = startDay >= 4 || startDay === 0; // Thursday to Sunday
  
  // Calculate billable hours (minimum 24 hours for weekend, 12 hours for weekday)
  const minimumHours = isWeekend ? 24 : 12;
  const billableHours = Math.max(minimumHours, durationInHours);
  
  // Return the price based on billable hours
  return billableHours * perHourRate;
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