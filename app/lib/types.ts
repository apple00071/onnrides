// Common Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  role: 'user' | 'admin';
  passwordHash: string;
}

// Vehicle Types
export interface Vehicle extends BaseEntity {
  name: string;
  description: string;
  type: 'car' | 'bike';
  model: string;
  year: number;
  color: string;
  registrationNumber: string;
  transmission: 'manual' | 'automatic';
  fuelType: string;
  mileage: number;
  seatingCapacity: number;
  pricePerDay: number;
  imageUrl: string;
  location: string;
  isAvailable: boolean;
}

// Booking Types
export interface Booking extends BaseEntity {
  userId: string;
  vehicleId: string;
  pickupDatetime: Date;
  dropoffDatetime: Date;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  paymentReference?: string;
}

// Document Types
export interface Document extends BaseEntity {
  userId: string;
  type: 'license' | 'identity' | 'address';
  fileUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  remarks?: string;
}

// Payment Types
export interface Payment extends BaseEntity {
  bookingId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  provider: string;
  metadata?: Record<string, any>;
} 