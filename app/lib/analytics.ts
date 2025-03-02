// Utility functions for Google Analytics event tracking

// Define types for analytics events
type EventParams = {
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  [key: string]: any;
};

// Check if we're in production environment
const isProduction = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';

// Send a custom event to Google Analytics
export const trackEvent = (
  eventName: string, 
  params: EventParams = {}
): void => {
  // Only track in production and if gtag is available
  if (!isProduction || !window.gtag) return;

  // Send the event to Google Analytics
  window.gtag('event', eventName, params);
};

// Track pageviews manually (although this is also done automatically in the GoogleAnalytics component)
export const trackPageView = (url: string): void => {
  if (!isProduction || !window.gtag) return;
  
  window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
    page_path: url,
  });
};

// Common event categories
export const EventCategory = {
  BOOKING: 'booking',
  VEHICLE: 'vehicle',
  USER: 'user',
  PAYMENT: 'payment',
  NAVIGATION: 'navigation',
  ENGAGEMENT: 'engagement',
};

// Common event actions
export const EventAction = {
  CLICK: 'click',
  VIEW: 'view',
  SUBMIT: 'submit',
  SEARCH: 'search',
  LOGIN: 'login',
  REGISTER: 'register',
  BOOK: 'book',
  PAYMENT: 'payment',
};

// Examples of how to use these functions:
// 
// // Track a booking event:
// trackEvent('booking_started', {
//   category: EventCategory.BOOKING,
//   action: EventAction.CLICK,
//   vehicle_type: 'bike',
//   vehicle_name: 'Honda Activa',
// });
// 
// // Track a login event:
// trackEvent('user_login', {
//   category: EventCategory.USER,
//   action: EventAction.LOGIN,
//   method: 'email',
// }); 