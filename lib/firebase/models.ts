import { Timestamp } from 'firebase-admin/firestore';

// Base model with common fields
interface BaseModel {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User model
export interface User extends BaseModel {
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin';
  avatar?: string;
  isActive: boolean;
  address?: string;
  documents?: string[];
}

// Vehicle model
export interface Vehicle extends BaseModel {
  name: string;
  description: string;
  categoryId: string;
  price: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  images: string[];
  features: string[];
  specifications: {
    [key: string]: string | number;
  };
  status: 'available' | 'maintenance' | 'rented';
  location: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  isActive: boolean;
}

// Category model
export interface Category extends BaseModel {
  name: string;
  description: string;
  image?: string;
  isActive: boolean;
}

// Booking model
export interface Booking extends BaseModel {
  userId: string;
  vehicleId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId?: string;
  deliveryAddress?: string;
  pickupLocation?: string;
  notes?: string;
}

// Document model
export interface Document extends BaseModel {
  userId: string;
  type: 'license' | 'id_proof' | 'address_proof';
  number: string;
  expiryDate?: Timestamp;
  status: 'pending' | 'verified' | 'rejected';
  url: string;
  verificationNotes?: string;
}

// Settings model
export interface Settings {
  maintenance_mode: boolean;
  booking_enabled: boolean;
  min_booking_hours: number;
  max_booking_days: number;
  business_hours: {
    start: string;
    end: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
  };
  updatedAt: Timestamp;
}

// Payment model
export interface Payment extends BaseModel {
  bookingId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  provider: 'razorpay';
  providerId: string;
  refundId?: string;
  metadata?: Record<string, any>;
}

// Review model
export interface Review extends BaseModel {
  userId: string;
  vehicleId: string;
  bookingId: string;
  rating: number;
  comment: string;
  images?: string[];
  isPublished: boolean;
}

// Notification model
export interface Notification extends BaseModel {
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'document' | 'system';
  isRead: boolean;
  metadata?: Record<string, any>;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  VEHICLES: 'vehicles',
  CATEGORIES: 'categories',
  BOOKINGS: 'bookings',
  DOCUMENTS: 'documents',
  SETTINGS: 'settings',
  PAYMENTS: 'payments',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
} as const; 