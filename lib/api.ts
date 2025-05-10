import logger from '@/lib/logger';
// Types for bookings
export interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_cost: number;
  created_at?: string;
}

// Types for vehicles
export interface Vehicle {
  id: string;
  name: string;
  type: 'bike' | 'scooter';
  model: string;
  year: number;
  daily_rate: number;
  availability: boolean;
  image_url?: string;
  description?: string;
}

// Mock local storage key
const BOOKINGS_STORAGE_KEY = 'userBookings';

// Mock local storage key for vehicles
const VEHICLES_STORAGE_KEY = 'userVehicles';

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Check if we're in a browser environment
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Get all bookings
export function getBookings(userId?: string): Booking[] {
  if (!isBrowser()) return [];

  try {
    const storedBookings = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    const bookings: Booking[] = storedBookings 
      ? JSON.parse(storedBookings) 
      : [];

    // If userId is provided, filter bookings for that user
    return userId 
      ? bookings.filter(booking => booking.user_id === userId)
      : bookings;
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    return [];
  }
}

// Create a new booking
export function createBooking(bookingData: Omit<Booking, 'id' | 'created_at'>): Booking {
  if (!isBrowser()) throw new Error('Booking can only be created in a browser');

  try {
    const storedBookings = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    const bookings: Booking[] = storedBookings 
      ? JSON.parse(storedBookings) 
      : [];

    const newBooking: Booking = {
      ...bookingData,
      id: generateId(),
      created_at: new Date().toISOString()
    };

    bookings.push(newBooking);
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));

    return newBooking;
  } catch (error) {
    logger.error('Error creating booking:', error);
    throw error;
  }
}

// Update an existing booking
export function updateBooking(bookingId: string, updates: Partial<Booking>): Booking | null {
  if (!isBrowser()) return null;

  try {
    const storedBookings = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    const bookings: Booking[] = storedBookings 
      ? JSON.parse(storedBookings) 
      : [];

    const bookingIndex = bookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      logger.error('Booking not found');
      return null;
    }

    // Update the booking
    bookings[bookingIndex] = {
      ...bookings[bookingIndex],
      ...updates
    };

    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));

    return bookings[bookingIndex];
  } catch (error) {
    logger.error('Error updating booking:', error);
    throw error;
  }
}

// Delete a booking
export function deleteBooking(bookingId: string): boolean {
  if (!isBrowser()) return false;

  try {
    const storedBookings = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    const bookings: Booking[] = storedBookings 
      ? JSON.parse(storedBookings) 
      : [];

    const initialLength = bookings.length;
    const filteredBookings = bookings.filter(b => b.id !== bookingId);

    if (filteredBookings.length === initialLength) {
      logger.error('Booking not found');
      return false;
    }

    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(filteredBookings));
    return true;
  } catch (error) {
    logger.error('Error deleting booking:', error);
    return false;
  }
}

// Get all vehicles
export function getVehicles(filters?: Partial<Vehicle>): Vehicle[] {
  if (!isBrowser()) return [];

  try {
    const storedVehicles = localStorage.getItem(VEHICLES_STORAGE_KEY);
    const vehicles: Vehicle[] = storedVehicles 
      ? JSON.parse(storedVehicles) 
      : [];

    // If filters are provided, apply them
    if (filters) {
      return vehicles.filter(vehicle => 
        Object.entries(filters).every(([key, value]) => vehicle[key as keyof Vehicle] === value)
      );
    }

    return vehicles;
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return [];
  }
}

// Create a new vehicle
export function createVehicle(vehicleData: Omit<Vehicle, 'id'>): Vehicle {
  if (!isBrowser()) throw new Error('Vehicle can only be created in a browser');

  try {
    const storedVehicles = localStorage.getItem(VEHICLES_STORAGE_KEY);
    const vehicles: Vehicle[] = storedVehicles 
      ? JSON.parse(storedVehicles) 
      : [];

    const newVehicle: Vehicle = {
      ...vehicleData,
      id: generateId()
    };

    vehicles.push(newVehicle);
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));

    return newVehicle;
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    throw error;
  }
}

// Update an existing vehicle
export function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Vehicle | null {
  if (!isBrowser()) return null;

  try {
    const storedVehicles = localStorage.getItem(VEHICLES_STORAGE_KEY);
    const vehicles: Vehicle[] = storedVehicles 
      ? JSON.parse(storedVehicles) 
      : [];

    const vehicleIndex = vehicles.findIndex(v => v.id === vehicleId);

    if (vehicleIndex === -1) {
      logger.error('Vehicle not found');
      return null;
    }

    // Update the vehicle
    vehicles[vehicleIndex] = {
      ...vehicles[vehicleIndex],
      ...updates
    };

    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));

    return vehicles[vehicleIndex];
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    throw error;
  }
}

// Delete a vehicle
export function deleteVehicle(vehicleId: string): boolean {
  if (!isBrowser()) return false;

  try {
    const storedVehicles = localStorage.getItem(VEHICLES_STORAGE_KEY);
    const vehicles: Vehicle[] = storedVehicles 
      ? JSON.parse(storedVehicles) 
      : [];

    const initialLength = vehicles.length;
    const filteredVehicles = vehicles.filter(v => v.id !== vehicleId);

    if (filteredVehicles.length === initialLength) {
      logger.error('Vehicle not found');
      return false;
    }

    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(filteredVehicles));
    return true;
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return false;
  }
}

// Seed initial vehicles if none exist
export function seedVehicles() {
  // Only seed if in browser and no existing vehicles
  if (isBrowser() && getVehicles().length === 0) {
    const initialVehicles: Omit<Vehicle, 'id'>[] = [
      {
        name: 'City Cruiser',
        type: 'bike',
        model: 'Sedan',
        year: 2022,
        daily_rate: 50,
        availability: true,
        image_url: '/images/city-cruiser.jpg',
        description: 'Comfortable city sedan perfect for urban driving'
      },
      {
        name: 'Mountain Explorer',
        type: 'bike',
        model: 'Adventure Bike',
        year: 2023,
        daily_rate: 30,
        availability: true,
        image_url: '/images/mountain-explorer.jpg',
        description: 'Rugged bike for off-road adventures'
      },
      {
        name: 'Urban Glider',
        type: 'bike',
        model: 'Electric Scooter',
        year: 2023,
        daily_rate: 20,
        availability: true,
        image_url: '/images/urban-glider.jpg',
        description: 'Eco-friendly electric scooter for city commutes'
      }
    ];

    initialVehicles.forEach(createVehicle);
  }
} 