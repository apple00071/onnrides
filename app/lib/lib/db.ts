import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';
import logger from '@/lib/logger';

export const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'sessions',
  RESET_TOKENS: 'reset_tokens',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  DOCUMENTS: 'documents',
  PROFILES: 'profiles'
} as const;

export type Collection = typeof COLLECTIONS[keyof typeof COLLECTIONS];

export interface BaseItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}

export async function set<T extends BaseItem>(collection: Collection, item: T): Promise<void> {
  try {
    const key = `${collection}:${item.id}`;
    await kv.set(key, JSON.stringify(item));
    logger.debug('Item set successfully:', { collection, id: item.id });
  } catch (error) {
    logger.error('Failed to set item:', error);
    throw error;
  }
}

export async function get<T extends BaseItem>(collection: Collection, id: string): Promise<T | null> {
  try {
    const key = `${collection}:${id}`;
    const data = await kv.get<string>(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error('Failed to get item:', error);
    throw error;
  }
}

type UpdateData<T> = {
  [P in keyof T]?: T[P];
} & {
  id?: never;
  createdAt?: never;
};

export async function update<T extends BaseItem>(
  collection: Collection,
  id: string,
  updates: UpdateData<T>
): Promise<void> {
  try {
    const item = await get<T>(collection, id);
    if (!item) {
      throw new Error(`Item not found: ${collection}:${id}`);
    }

    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: updates.updatedAt || new Date()
    };

    await set(collection, updatedItem);
    logger.debug('Item updated successfully:', { collection, id });
  } catch (error) {
    logger.error('Failed to update item:', error);
    throw error;
  }
}

export async function remove(collection: Collection, id: string): Promise<void> {
  try {
    const key = `${collection}:${id}`;
    await kv.del(key);
    logger.debug('Item removed successfully:', { collection, id });
  } catch (error) {
    logger.error('Failed to remove item:', error);
    throw error;
  }
}

export async function findOneBy<T extends BaseItem>(
  collection: Collection,
  field: keyof T,
  value: T[keyof T]
): Promise<T | null> {
  try {
    // Get all items in the collection
    const pattern = `${collection}:*`;
    const keys = await kv.keys(pattern);
    
    // Search through items
    for (const key of keys) {
      const data = await kv.get<string>(key);
      if (!data) continue;
      
      const item = JSON.parse(data) as T;
      if (item[field] === value) {
        return item;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to find item:', error);
    throw error;
  }
}

export async function findMany<T extends BaseItem>(
  collection: Collection,
  field: keyof T,
  value: T[keyof T]
): Promise<T[]> {
  try {
    // Get all items in the collection
    const pattern = `${collection}:*`;
    const keys = await kv.keys(pattern);
    const items: T[] = [];
    
    // Search through items
    for (const key of keys) {
      const data = await kv.get<string>(key);
      if (!data) continue;
      
      const item = JSON.parse(data) as T;
      if (item[field] === value) {
        items.push(item);
      }
    }
    
    return items;
  } catch (error) {
    logger.error('Failed to find items:', error);
    throw error;
  }
} 