import { sql } from '@vercel/postgres';
import type { User, Vehicle, Booking, Document } from './types';
import logger from './logger';
import { env } from './env';

// Export common database operations
export const get = findDocumentById;
export const findOneBy = findUserById;
export const findMany = findBookings;
export const findAll = findVehicles;
export const set = createDocument;
export const remove = deleteVehicle;
export const insertOne = createVehicle;
export const generateId = () => crypto.randomUUID();

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    logger.info('Finding user by email:', email);
    const result = await sql<User>`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `;
    logger.info('User search result:', result.rows[0] ? 'Found' : 'Not found');
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw error;
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    logger.info('Finding user by ID:', id);
    const result = await sql<User>`
      SELECT * FROM users WHERE id = ${id} LIMIT 1
    `;
    logger.info('User search result:', result.rows[0] ? 'Found' : 'Not found');
    return result.rows[0] || null;
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
    const result = await sql<User>`
      INSERT INTO users (
        email, password_hash, name, role, created_at, updated_at
      ) VALUES (
        ${data.email}, 
        ${data.password_hash}, 
        ${data.name || null}, 
        ${data.role || 'user'}, 
        NOW(), 
        NOW()
      )
      RETURNING *
    `;
    logger.info('User created successfully');
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const updates = Object.entries(data)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([key, value]) => `${key} = ${value === null ? 'NULL' : `'${value}'`}`)
    .join(', ');

  const result = await sql<User>`
    UPDATE users 
    SET ${updates}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0] || null;
}

export async function findVehicleById(id: string): Promise<Vehicle | null> {
  const result = await sql<Vehicle>`
    SELECT * FROM vehicles WHERE id = ${id} LIMIT 1
  `;
  return result.rows[0] || null;
}

export async function findVehicles(filters?: {
  isAvailable?: boolean;
  type?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
}): Promise<Vehicle[]> {
  let query = 'SELECT * FROM vehicles';
  const values: any[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (filters) {
    if (typeof filters.isAvailable === 'boolean') {
      conditions.push(`is_available = $${paramIndex}`);
      values.push(filters.isAvailable);
      paramIndex++;
    }
    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(filters.type);
      paramIndex++;
    }
    if (filters.location) {
      conditions.push(`location = $${paramIndex}`);
      values.push(filters.location);
      paramIndex++;
    }
    if (filters.minPrice) {
      conditions.push(`price_per_day >= $${paramIndex}`);
      values.push(filters.minPrice);
      paramIndex++;
    }
    if (filters.maxPrice) {
      conditions.push(`price_per_day <= $${paramIndex}`);
      values.push(filters.maxPrice);
      paramIndex++;
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  const result = await sql.query<Vehicle>(query, values);

  return result.rows.map(vehicle => ({
    ...vehicle,
    price_per_day: vehicle.price_per_day.toString()
  }));
}

export async function createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
  const values = [
    data.name!,
    data.type!,
    data.quantity || 1,
    data.price_per_day!,
    data.location!,
    data.images || [],
    data.is_available ?? true,
    data.status || 'active'
  ];

  const result = await sql.query<Vehicle>(`
    INSERT INTO vehicles (
      name, type, quantity, price_per_day, location, images, 
      is_available, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
    )
    RETURNING *
  `, values);

  return {
    ...result.rows[0],
    price_per_day: result.rows[0].price_per_day.toString()
  };
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle | null> {
  const updates = Object.entries(data)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([key, value]) => `${key} = ${value === null ? 'NULL' : `'${value}'`}`)
    .join(', ');

  const result = await sql<Vehicle>`
    UPDATE vehicles 
    SET ${updates}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return result.rows[0] ? {
    ...result.rows[0],
    price_per_day: result.rows[0].price_per_day.toString()
  } : null;
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM vehicles WHERE id = ${id} RETURNING *
  `;
  return result.rows.length > 0;
}

export async function findBookingById(id: string): Promise<Booking | null> {
  const result = await sql<Booking>`
    SELECT * FROM bookings WHERE id = ${id} LIMIT 1
  `;
  return result.rows[0] ? {
    ...result.rows[0],
    total_price: result.rows[0].total_price.toString()
  } : null;
}

export async function findBookings(filters?: {
  userId?: string;
  vehicleId?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}): Promise<Booking[]> {
  let query = 'SELECT * FROM bookings';
  const values: any[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (filters) {
    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(filters.userId);
      paramIndex++;
    }
    if (filters.vehicleId) {
      conditions.push(`vehicle_id = $${paramIndex}`);
      values.push(filters.vehicleId);
      paramIndex++;
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  const result = await sql.query<Booking>(query, values);

  return result.rows.map(booking => ({
    ...booking,
    total_price: booking.total_price.toString()
  }));
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  const values = [
    data.user_id!,
    data.vehicle_id!,
    data.start_date!,
    data.end_date!,
    data.total_price!,
    data.status || 'pending',
    data.payment_status || 'pending'
  ];

  const result = await sql.query<Booking>(`
    INSERT INTO bookings (
      user_id, vehicle_id, start_date, end_date, total_price,
      status, payment_status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
    )
    RETURNING *
  `, values);

  return {
    ...result.rows[0],
    total_price: result.rows[0].total_price.toString()
  };
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<Booking | null> {
  const updates = Object.entries(data)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([key, value]) => `${key} = ${value === null ? 'NULL' : `'${value}'`}`)
    .join(', ');

  const result = await sql<Booking>`
    UPDATE bookings 
    SET ${updates}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return result.rows[0] ? {
    ...result.rows[0],
    total_price: result.rows[0].total_price.toString()
  } : null;
}

export async function findDocumentById(id: string): Promise<Document | null> {
  const result = await sql<Document>`
    SELECT * FROM documents WHERE id = ${id} LIMIT 1
  `;
  return result.rows[0] ? {
    ...result.rows[0],
    rejection_reason: result.rows[0].rejection_reason || undefined
  } : null;
}

export async function findDocuments(filters?: {
  userId?: string;
  type?: 'license' | 'id_proof' | 'address_proof';
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<Document[]> {
  let query = 'SELECT * FROM documents';
  const values: any[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (filters) {
    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(filters.userId);
      paramIndex++;
    }
    if (filters.type) {
      conditions.push(`type = $${paramIndex}`);
      values.push(filters.type);
      paramIndex++;
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  const result = await sql.query<Document>(query, values);

  return result.rows.map(doc => ({
    ...doc,
    rejection_reason: doc.rejection_reason || undefined
  }));
}

export async function createDocument(data: Partial<Document>): Promise<Document> {
  const values = [
    data.user_id!,
    data.type!,
    data.file_url!,
    data.status || 'pending',
    data.rejection_reason
  ];

  const result = await sql.query<Document>(`
    INSERT INTO documents (
      user_id, type, file_url, status, rejection_reason, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), NOW()
    )
    RETURNING *
  `, values);

  return {
    ...result.rows[0],
    rejection_reason: result.rows[0].rejection_reason || undefined
  };
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<Document | null> {
  const updates = Object.entries(data)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([key, value]) => `${key} = ${value === null ? 'NULL' : `'${value}'`}`)
    .join(', ');

  const result = await sql<Document>`
    UPDATE documents 
    SET ${updates}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  return result.rows[0] ? {
    ...result.rows[0],
    rejection_reason: result.rows[0].rejection_reason || undefined
  } : null;
}

export { sql }; 