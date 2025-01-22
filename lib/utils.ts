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

export function formatCurrency(amount: number) {
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

export function calculateTotalPrice(startDate: Date, endDate: Date, pricePerHour: number): number {
  // Calculate base price using the booking price logic
  const basePrice = calculateBookingPrice(
    { 
      price_per_day: pricePerHour,
      price_12hrs: pricePerHour * 12,
      price_24hrs: pricePerHour * 24,
      price_7days: pricePerHour * 24 * 7,
      price_15days: pricePerHour * 24 * 15,
      price_30days: pricePerHour * 24 * 30,
      min_booking_hours: 1
    },
    startDate,
    endDate
  );
  
  // Add GST (18%)
  const gst = basePrice * 0.18;
  
  // Add service fee (5%)
  const serviceFee = basePrice * 0.05;
  
  // Return total price with exactly 2 decimal places
  return Number((basePrice + gst + serviceFee).toFixed(2));
}

export function calculateDuration(startDate: Date, endDate: Date): number {
  const diffInMilliseconds = endDate.getTime() - startDate.getTime();
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  return Math.max(Math.round(diffInHours), 1);
} 