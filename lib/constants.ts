// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-development-secret-key';

// Cookie Configuration
export const COOKIE_NAME = 'token';
export const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

// Auth Configuration
export const AUTH_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const; 