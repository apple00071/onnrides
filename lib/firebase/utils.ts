import { adminDb } from './config';
import { Timestamp, FieldValue, Query, WhereFilterOp } from 'firebase-admin/firestore';
import { COLLECTIONS } from './models';

// Types
type CollectionName = keyof typeof COLLECTIONS;
type WhereClause = [string, WhereFilterOp, any];
type OrderByClause = { field: string; direction: 'asc' | 'desc' };

interface QueryOptions {
  where?: WhereClause[];
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
}

// Helper function to convert Firestore timestamps to dates
export function timestampToDate(timestamp: Timestamp | null | undefined): Date | null {
  return timestamp ? timestamp.toDate() : null;
}

// Helper function to convert dates to Firestore timestamps
export function dateToTimestamp(date: Date | null | undefined): Timestamp | null {
  return date ? Timestamp.fromDate(date) : null;
}

// Get a document by ID
export async function getDocById<T>(collection: CollectionName, id: string): Promise<T | null> {
  try {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as T;
  } catch (error) {
    console.error(`Error getting ${collection} document:`, error);
    throw error;
  }
}

// Query documents with filters, ordering, and pagination
export async function queryDocs<T>(
  collection: CollectionName,
  options: QueryOptions = {}
): Promise<T[]> {
  try {
    let query: Query = adminDb.collection(COLLECTIONS[collection]);

    // Apply where clauses
    if (options.where) {
      for (const [field, operator, value] of options.where) {
        query = query.where(field, operator, value);
      }
    }

    // Apply orderBy clauses
    if (options.orderBy) {
      for (const { field, direction } of options.orderBy) {
        query = query.orderBy(field, direction);
      }
    }

    // Apply pagination
    if (options.offset) {
      query = query.offset(options.offset);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  } catch (error) {
    console.error(`Error querying ${collection} collection:`, error);
    throw error;
  }
}

// Create a new document
export async function createDoc<T>(
  collection: CollectionName,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc();
    await docRef.set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating ${collection} document:`, error);
    throw error;
  }
}

// Update a document
export async function updateDoc<T>(
  collection: CollectionName,
  id: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(id);
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating ${collection} document:`, error);
    throw error;
  }
}

// Delete a document
export async function deleteDoc(collection: CollectionName, id: string): Promise<void> {
  try {
    const docRef = adminDb.collection(COLLECTIONS[collection]).doc(id);
    await docRef.delete();
  } catch (error) {
    console.error(`Error deleting ${collection} document:`, error);
    throw error;
  }
}

// Get multiple documents by IDs
export async function getDocsByIds<T>(
  collection: CollectionName,
  ids: string[]
): Promise<T[]> {
  try {
    if (!ids.length) return [];

    const docRefs = ids.map(id => adminDb.collection(COLLECTIONS[collection]).doc(id));
    const docs = await adminDb.getAll(...docRefs);

    return docs
      .filter(doc => doc.exists)
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
  } catch (error) {
    console.error(`Error getting multiple ${collection} documents:`, error);
    throw error;
  }
}

// Batch write operations
export async function batchWrite(operations: {
  create?: { collection: CollectionName; data: any }[];
  update?: { collection: CollectionName; id: string; data: any }[];
  delete?: { collection: CollectionName; id: string }[];
}): Promise<void> {
  const batch = adminDb.batch();

  try {
    // Handle creates
    if (operations.create) {
      for (const { collection, data } of operations.create) {
        const docRef = adminDb.collection(COLLECTIONS[collection]).doc();
        batch.set(docRef, {
          ...data,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Handle updates
    if (operations.update) {
      for (const { collection, id, data } of operations.update) {
        const docRef = adminDb.collection(COLLECTIONS[collection]).doc(id);
        batch.update(docRef, {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Handle deletes
    if (operations.delete) {
      for (const { collection, id } of operations.delete) {
        const docRef = adminDb.collection(COLLECTIONS[collection]).doc(id);
        batch.delete(docRef);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Error in batch write:', error);
    throw error;
  }
}

// Transaction operations
export async function runTransaction<T>(
  callback: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> {
  try {
    return await adminDb.runTransaction(callback);
  } catch (error) {
    console.error('Error in transaction:', error);
    throw error;
  }
} 