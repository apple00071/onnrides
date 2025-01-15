import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { eq, and, SQL } from 'drizzle-orm';
import * as schema from './schema';

export const db = drizzle(sql, { schema });

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  LOCATIONS: 'locations',
  VEHICLES: 'vehicles',
  VEHICLE_LOCATIONS: 'vehicle_locations',
  DOCUMENTS: 'documents',
  BOOKINGS: 'bookings'
} as const;

// Users
export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  return user;
}

export async function findUserById(id: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return user;
}

export async function createUser(data: typeof schema.users.$inferInsert) {
  const [user] = await db
    .insert(schema.users)
    .values(data)
    .returning();
  return user;
}

export async function updateUser(id: string, data: Partial<typeof schema.users.$inferInsert>) {
  const [user] = await db
    .update(schema.users)
    .set(data)
    .where(eq(schema.users.id, id))
    .returning();
  return user;
}

// Vehicles
export async function findVehicleById(id: string) {
  const [vehicle] = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.id, id));
  return vehicle;
}

export async function findVehicles(where?: SQL<unknown>) {
  const vehicles = await db
    .select()
    .from(schema.vehicles)
    .where(where);
  return vehicles;
}

export async function createVehicle(data: typeof schema.vehicles.$inferInsert) {
  const [vehicle] = await db
    .insert(schema.vehicles)
    .values(data)
    .returning();
  return vehicle;
}

export async function updateVehicle(id: string, data: Partial<typeof schema.vehicles.$inferInsert>) {
  const [vehicle] = await db
    .update(schema.vehicles)
    .set(data)
    .where(eq(schema.vehicles.id, id))
    .returning();
  return vehicle;
}

export async function deleteVehicle(id: string) {
  const [vehicle] = await db
    .delete(schema.vehicles)
    .where(eq(schema.vehicles.id, id))
    .returning();
  return vehicle;
}

// Bookings
export async function findBookingById(id: string) {
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, id));
  return booking;
}

export async function findBookings(where?: SQL<unknown>) {
  const bookings = await db
    .select()
    .from(schema.bookings)
    .where(where);
  return bookings;
}

export async function createBooking(data: typeof schema.bookings.$inferInsert) {
  const [booking] = await db
    .insert(schema.bookings)
    .values(data)
    .returning();
  return booking;
}

export async function updateBooking(id: string, data: Partial<typeof schema.bookings.$inferInsert>) {
  const [booking] = await db
    .update(schema.bookings)
    .set(data)
    .where(eq(schema.bookings.id, id))
    .returning();
  return booking;
}

// Documents
export async function findDocumentById(id: string) {
  const [document] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id));
  return document;
}

export async function findDocuments(where?: SQL<unknown>) {
  const documents = await db
    .select()
    .from(schema.documents)
    .where(where);
  return documents;
}

export async function createDocument(data: typeof schema.documents.$inferInsert) {
  const [document] = await db
    .insert(schema.documents)
    .values(data)
    .returning();
  return document;
}

export async function updateDocument(id: string, data: Partial<typeof schema.documents.$inferInsert>) {
  const [document] = await db
    .update(schema.documents)
    .set(data)
    .where(eq(schema.documents.id, id))
    .returning();
  return document;
}

// Export the pool for direct SQL queries if needed
export default sql; 