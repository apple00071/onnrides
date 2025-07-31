import { getAdminDb } from '../firebase/admin';
import logger from '../logger';
import { WhereFilterOp } from 'firebase-admin/firestore';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';

export type DbUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
};

export type NewDbUser = Omit<DbUser, 'id' | 'created_at' | 'updated_at'>;

class FirebaseDatabase {
  private static instance: FirebaseDatabase;
  private db: ReturnType<typeof getAdminDb>;

  private constructor() {
    this.db = getAdminDb();
  }

  public static getInstance(): FirebaseDatabase {
    if (!FirebaseDatabase.instance) {
      FirebaseDatabase.instance = new FirebaseDatabase();
    }
    return FirebaseDatabase.instance;
  }

  async query<T>(collection: string, where?: { field: string; operator: WhereFilterOp; value: any }[]): Promise<T[]> {
    try {
      let query = this.db.collection(collection);

      if (where) {
        where.forEach(({ field, operator, value }) => {
          query = query.where(field, operator, value) as any;
        });
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
    } catch (error) {
      logger.error(`Error querying collection ${collection}:`, error);
      throw error;
    }
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    try {
      const doc = await this.db.collection(collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      logger.error(`Error getting document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  async create<T>(collection: string, data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await this.db.collection(collection).add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error(`Error creating document in ${collection}:`, error);
      throw error;
    }
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<void> {
    try {
      await this.db.collection(collection).doc(id).update({
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error(`Error updating document ${id} in ${collection}:`, error);
      throw error;
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      await this.db.collection(collection).doc(id).delete();
    } catch (error) {
      logger.error(`Error deleting document ${id} from ${collection}:`, error);
      throw error;
    }
  }

  // Legacy query function to maintain compatibility
  async rawQuery<T>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    logger.warn('Legacy SQL query being used, should be migrated to Firestore:', text);
    // For now, return empty result
    return { rows: [] };
  }

  // User-related functions
  async findUserByEmail(email: string): Promise<DbUser | null> {
    try {
      const snapshot = await this.db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().createdAt.toDate(),
        updated_at: doc.data().updatedAt.toDate(),
      } as DbUser;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  async createUser(data: Partial<NewDbUser>): Promise<DbUser> {
    try {
      const id = createId();
      const now = new Date();
      const userData: DbUser = {
        id,
        name: data.name || null,
        email: data.email!,
        password_hash: data.password_hash!,
        role: data.role || 'user',
        phone: data.phone || null,
        reset_token: null,
        reset_token_expiry: null,
        is_blocked: false,
        created_at: now,
        updated_at: now,
      };

      await this.db.collection('users').doc(id).set(userData);
      return userData;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }
}

export const db = FirebaseDatabase.getInstance();

// Export legacy query function to maintain compatibility
export async function query<T>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  return db.rawQuery<T>(text, params);
}

// Export user-related functions
export async function findUserByEmail(email: string): Promise<DbUser | null> {
  return db.findUserByEmail(email);
}

export async function createUser(data: Partial<NewDbUser>): Promise<DbUser> {
  return db.createUser(data);
} 