import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users, vehicles, bookings, documents } from './schema';
import { eq, and, or, not, SQL, SQLWrapper, asc, desc, gte, lte } from 'drizzle-orm';
import type { User, Vehicle, Booking, Document } from './types';
import logger from './logger';

// Initialize database with error handling
let db: ReturnType<typeof drizzle>;
try {
  const sql = neon(process.env.DATABASE_URL!);
  db = drizzle(sql);
  logger.info('Database connection initialized');
} catch (error) {
  logger.error('Failed to initialize database connection:', error);
  throw error;
}

export { db };

// Export collections
export const COLLECTIONS = {
  users,
  vehicles,
  bookings,
  documents
};

// Export common database operations
export const get = findDocumentById;
export const findOneBy = findUserById;
export const findMany = findBookings;
export const findAll = findVehicles;
export const set = createDocument;
export const update = updateBooking;
export const remove = deleteVehicle;
export const insertOne = createVehicle;
export const updateOne = updateBooking;
export const generateId = () => crypto.randomUUID();

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    logger.info('Finding user by email:', email);
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    logger.info('User search result:', result[0] ? 'Found' : 'Not found');
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw error;
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    logger.info('Finding user by ID:', id);
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    logger.info('User search result:', result[0] ? 'Found' : 'Not found');
    return result[0] || null;
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw error;
  }
}

type CreateUserData = {
  email: string;
  password_hash: string;
  name?: string | null;
  role?: 'user' | 'admin';
};

export async function createUser(data: CreateUserData): Promise<User> {
  try {
    logger.info('Creating new user');
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        password_hash: data.password_hash,
        name: data.name || null,
        role: data.role || 'user',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    logger.info('User created successfully');
    return user;
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return user || null;
}

export async function findVehicleById(id: string): Promise<Vehicle | null> {
  const result = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  return result[0] || null;
}

export async function findVehicles(filters?: {
  isAvailable?: boolean;
  type?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
}): Promise<Vehicle[]> {
  let conditions: SQLWrapper[] = [];

  if (filters) {
    if (typeof filters.isAvailable === 'boolean') {
      conditions.push(eq(vehicles.is_available, filters.isAvailable));
    }

    if (filters.type) {
      conditions.push(eq(vehicles.type, filters.type));
    }

    if (filters.location) {
      conditions.push(eq(vehicles.location, filters.location));
    }

    if (filters.minPrice) {
      conditions.push(gte(vehicles.price_per_day, filters.minPrice));
    }

    if (filters.maxPrice) {
      conditions.push(lte(vehicles.price_per_day, filters.maxPrice));
    }
  }

  const result = await db
    .select()
    .from(vehicles)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result.map(vehicle => ({
    ...vehicle,
    price_per_day: vehicle.price_per_day.toString(),
  }));
}

export async function createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
  const [vehicle] = await db
    .insert(vehicles)
    .values({
      name: data.name!,
      type: data.type!,
      quantity: data.quantity || 1,
      price_per_day: data.price_per_day!,
      location: data.location!,
      images: data.images || [],
      is_available: data.is_available ?? true,
      status: data.status || 'active',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  return {
    ...vehicle,
    price_per_day: vehicle.price_per_day.toString(),
  };
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
  const [vehicle] = await db
    .update(vehicles)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(vehicles.id, id))
    .returning();
  return vehicle ? {
    ...vehicle,
    price_per_day: vehicle.price_per_day.toString(),
  } : null;
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const result = await db
    .delete(vehicles)
    .where(eq(vehicles.id, id))
    .returning();
  return result.length > 0;
}

export async function findBookingById(id: string): Promise<Booking | null> {
  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  return result[0] ? {
    ...result[0],
    total_price: result[0].total_price.toString(),
  } : null;
}

export async function findBookings(filters?: {
  userId?: string;
  vehicleId?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}): Promise<Booking[]> {
  let conditions: SQLWrapper[] = [];

  if (filters) {
    if (filters.userId) {
      conditions.push(eq(bookings.user_id, filters.userId));
    }

    if (filters.vehicleId) {
      conditions.push(eq(bookings.vehicle_id, filters.vehicleId));
    }

    if (filters.status) {
      conditions.push(eq(bookings.status, filters.status));
    }
  }

  const result = await db
    .select()
    .from(bookings)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result.map(booking => ({
    ...booking,
    total_price: booking.total_price.toString(),
  }));
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  const [booking] = await db
    .insert(bookings)
    .values({
      user_id: data.user_id!,
      vehicle_id: data.vehicle_id!,
      start_date: data.start_date!,
      end_date: data.end_date!,
      total_price: data.total_price!,
      status: data.status || 'pending',
      payment_status: data.payment_status || 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  return {
    ...booking,
    total_price: booking.total_price.toString(),
  };
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<Booking | null> {
  const [booking] = await db
    .update(bookings)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(bookings.id, id))
    .returning();
  return booking ? {
    ...booking,
    total_price: booking.total_price.toString(),
  } : null;
}

export async function findDocumentById(id: string): Promise<Document | null> {
  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return result[0] ? {
    ...result[0],
    rejection_reason: result[0].rejection_reason || undefined,
  } : null;
}

export async function findDocuments(filters?: {
  userId?: string;
  type?: 'license' | 'id_proof' | 'address_proof';
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<Document[]> {
  let conditions: SQLWrapper[] = [];

  if (filters) {
    if (filters.userId) {
      conditions.push(eq(documents.user_id, filters.userId));
    }

    if (filters.type) {
      conditions.push(eq(documents.type, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(documents.status, filters.status));
    }
  }

  const result = await db
    .select()
    .from(documents)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result.map(doc => ({
    ...doc,
    rejection_reason: doc.rejection_reason || undefined,
  }));
}

export async function createDocument(data: Partial<Document>): Promise<Document> {
  const [document] = await db
    .insert(documents)
    .values({
      user_id: data.user_id!,
      type: data.type!,
      file_url: data.file_url!,
      status: data.status || 'pending',
      rejection_reason: data.rejection_reason,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  return {
    ...document,
    rejection_reason: document.rejection_reason || undefined,
  };
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document | null> {
  const [document] = await db
    .update(documents)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(documents.id, id))
    .returning();
  return document ? {
    ...document,
    rejection_reason: document.rejection_reason || undefined,
  } : null;
} 