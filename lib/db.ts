import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import { users, vehicles, bookings, documents } from './schema';
import { eq, and, or, not, SQL, SQLWrapper, asc, desc } from 'drizzle-orm';
import type { User, Vehicle, Booking, Document } from './types';

export const db = drizzle(sql);

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createUser(data: Partial<User>): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email!,
      name: data.name || null,
      password_hash: data.password_hash!,
      role: data.role || 'user',
      is_blocked: data.is_blocked || false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();
  return user;
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
      conditions.push(sql`CAST(${vehicles.price_per_day} AS DECIMAL) >= CAST(${sql.raw(filters.minPrice)} AS DECIMAL)`);
    }

    if (filters.maxPrice) {
      conditions.push(sql`CAST(${vehicles.price_per_day} AS DECIMAL) <= CAST(${sql.raw(filters.maxPrice)} AS DECIMAL)`);
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